"use client";

import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { IconTile } from "@/components/common/icon-tile";
import { useToggleHabitToday } from "@/hooks/use-habits";
import { tone } from "@/lib/colors";
import { addDays, formatDayMonth } from "@/lib/dates";
import type { HabitView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

/** 7 chấm, phần tử cuối là hôm nay; chấm đã làm tô màu thói quen. */
export function Last7({ habit, className }: { habit: HabitView; className?: string }) {
  const color = tone(habit.color).fg;
  return (
    <span className={cn("flex items-center gap-1", className)} aria-label={t.habits.last7}>
      {habit.last7.map((done, i) => {
        const day = formatDayMonth(addDays(habit.today, i - 6));
        return (
          <span
            key={i}
            role="img"
            aria-label={done ? t.habits.dayDone(day) : t.habits.dayMissed(day)}
            className={cn("size-2 rounded-full", !done && "bg-surface-2", i === 6 && "size-2.5")}
            style={done ? { background: color } : undefined}
          />
        );
      })}
    </span>
  );
}

export function HabitRow({ habit: h, compact }: { habit: HabitView; compact?: boolean }) {
  const openHabit = useUi((s) => s.openHabit);
  const toggle = useToggleHabitToday();
  const weekHit = h.week_count >= h.target_per_week;

  const onToggle = async () => {
    try {
      await toggle.mutateAsync(h.id);
    } catch {
      toast.error(t.habits.dialog.errors.save);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-surface-2 last:border-b-0 md:gap-4",
        compact ? "py-1.5" : "py-2.5",
      )}
    >
      <button
        type="button"
        onClick={() => openHabit(h)}
        className="flex min-h-11 min-w-0 grow cursor-pointer items-center gap-3.5 border-0 bg-transparent p-0 text-left text-text"
      >
        <IconTile icon={h.icon} color={h.color} size={compact ? 36 : 42} />
        <span className="flex min-w-0 grow flex-col gap-[3px]">
          <span className={cn("truncate text-[15px] font-medium", h.archived_at && "text-soft")}>
            {h.name}
          </span>
          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {h.streak > 0 && <Flame className="size-3.5 text-cat-orange" aria-hidden />}
            {t.habits.streak(h.streak)}
            <span aria-hidden>·</span>
            <span className={cn("whitespace-nowrap", weekHit && "font-medium text-cat-green")}>
              {compact
                ? t.habits.weekShort(h.week_count, h.target_per_week)
                : t.habits.week(h.week_count, h.target_per_week)}
            </span>
          </span>
        </span>
        {!compact && <Last7 habit={h} className="hidden sm:flex" />}
      </button>
      {!h.archived_at && (
        <button
          type="button"
          role="checkbox"
          aria-checked={h.done_today}
          aria-label={h.done_today ? t.habits.untick(h.name) : t.habits.tick(h.name)}
          onClick={onToggle}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
        >
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-full border-2 transition-colors",
              h.done_today ? "border-accent bg-accent text-bg" : "border-border-strong bg-bg",
            )}
          >
            <Check
              className={cn("size-[18px]", !h.done_today && "text-dim")}
              strokeWidth={3}
              aria-hidden
            />
          </span>
        </button>
      )}
    </div>
  );
}
