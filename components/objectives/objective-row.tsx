"use client";

import { Check, CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { IconTile } from "@/components/common/icon-tile";
import { ProgressBar } from "@/components/common/progress-bar";
import { useToggleObjectiveToday } from "@/hooks/use-objectives";
import { tone } from "@/lib/colors";
import { daysBetween } from "@/lib/dates";
import { objectivePlan, type ObjectivePlan, type ObjectiveStatus } from "@/lib/objectives";
import type { ObjectiveView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

const STATUS_CLS: Record<ObjectiveStatus, string> = {
  done: "bg-cat-green-bg text-cat-green",
  on_track: "bg-cat-green-bg text-cat-green",
  behind: "bg-cat-orange-bg text-cat-orange",
  overdue: "bg-cat-red-bg text-cat-red",
  upcoming: "bg-surface-2 text-soft",
  open: "bg-surface-2 text-soft",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ObjectiveStatus;
  className?: string;
}) {
  const Icon =
    status === "done" || status === "on_track"
      ? CircleCheck
      : status === "behind" || status === "overdue"
        ? TriangleAlert
        : null;
  return (
    <span
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-[11px] px-[11px] py-1.5 text-xs font-semibold whitespace-nowrap",
        STATUS_CLS[status],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {t.objectives.status[status]}
    </span>
  );
}

/** "Còn 54 ngày" / "Quá hạn 3 ngày" / "Bắt đầu sau 5 ngày"; null khi không có gì đáng nói. */
export function timeText(o: ObjectiveView, plan: ObjectivePlan) {
  if (o.completed_at) return null;
  if (plan.status === "upcoming") return t.objectives.startsIn(daysBetween(o.today, o.start_on));
  if (plan.daysLeft === null) return null;
  return plan.daysLeft < 0
    ? t.objectives.overdueDays(-plan.daysLeft)
    : t.objectives.daysLeft(plan.daysLeft);
}

/** Nút tròn tick "đã làm buổi hôm nay". */
export function SessionTick({
  objective: o,
  size = "md",
}: {
  objective: ObjectiveView;
  size?: "md" | "lg";
}) {
  const toggle = useToggleObjectiveToday();
  const onToggle = async () => {
    try {
      await toggle.mutateAsync(o.id);
    } catch {
      toast.error(t.objectives.detail.errors.save);
    }
  };
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={o.done_today}
      aria-label={o.done_today ? t.objectives.untick(o.title) : t.objectives.tick(o.title)}
      onClick={onToggle}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-colors",
          size === "lg" ? "size-10" : "size-9",
          o.done_today ? "border-accent bg-accent text-bg" : "border-border-strong bg-bg",
        )}
      >
        <Check
          className={cn("size-[18px]", !o.done_today && "text-dim")}
          strokeWidth={3}
          aria-hidden
        />
      </span>
    </button>
  );
}

export function ObjectiveRow({
  objective: o,
  compact,
}: {
  objective: ObjectiveView;
  compact?: boolean;
}) {
  const plan = objectivePlan(o);
  const color = tone(o.color).fg;
  const when = timeText(o, plan);
  const canTick = !o.completed_at && plan.status !== "upcoming";
  const meta = [
    o.outputs_total > 0 ? t.objectives.outputsCount(o.outputs_done, o.outputs_total) : null,
    o.sessions_per_week && canTick
      ? t.objectives.weekSessions(o.week_count, o.sessions_per_week)
      : null,
    when,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-surface-2 last:border-b-0 md:gap-4",
        compact ? "py-2" : "py-3",
      )}
    >
      <Link
        href={`/objectives/${o.id}`}
        className="flex min-h-11 min-w-0 grow items-center gap-3.5 text-text no-underline hover:text-text"
      >
        <IconTile icon={o.icon} color={o.color} size={compact ? 36 : 42} />
        <span className="flex min-w-0 grow flex-col gap-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className={cn("truncate text-[15px] font-medium", o.completed_at && "text-soft")}>
              {o.title}
            </span>
            {!compact && <StatusBadge status={plan.status} className="hidden sm:flex" />}
            {plan.pct !== null && (
              <span className="shrink-0 text-xs text-muted-foreground sm:hidden">{plan.pct}%</span>
            )}
          </span>
          {plan.pct !== null && (
            <ProgressBar
              value={plan.pct}
              color={color}
              marker={plan.status === "done" ? null : plan.timePct}
            />
          )}
          <span
            className={cn(
              "truncate text-xs text-muted-foreground",
              (plan.status === "behind" || plan.status === "overdue") && "text-cat-orange",
            )}
          >
            {compact || meta.length === 0
              ? [t.objectives.status[plan.status], ...meta].join(" · ")
              : meta.join(" · ")}
          </span>
        </span>
      </Link>
      {canTick && <SessionTick objective={o} />}
    </div>
  );
}
