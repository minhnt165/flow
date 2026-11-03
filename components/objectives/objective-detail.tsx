"use client";

import { Check, CircleCheck, Pencil, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { IconTile } from "@/components/common/icon-tile";
import { ProgressBar } from "@/components/common/progress-bar";
import { ProgressRing } from "@/components/common/progress-ring";
import { CardSkeleton, EmptyState, ErrorState, RowsSkeleton } from "@/components/common/states";
import { PageHeader } from "@/components/layout/page";
import { StatusBadge, timeText } from "@/components/objectives/objective-row";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useAddObjectiveOutput,
  useCompleteObjective,
  useDeleteObjectiveOutput,
  useObjective,
  useObjectiveOutputs,
  useObjectiveSessions,
  useToggleObjectiveOutput,
  useToggleObjectiveToday,
} from "@/hooks/use-objectives";
import { tone } from "@/lib/colors";
import { formatDate, formatDayMonth } from "@/lib/dates";
import { objectivePlan, weekBuckets, type ObjectivePlan } from "@/lib/objectives";
import type { ObjectiveView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const d = t.objectives.detail;
const inputCls =
  "min-h-11 w-full min-w-0 rounded-[14px] border border-border bg-bg px-3.5 text-base text-text outline-none placeholder:text-dim focus-visible:border-accent/60 md:text-[15px] [color-scheme:dark]";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("font-display text-lg font-bold", accent && "text-accent")}>{value}</span>
    </div>
  );
}

function Hero({ o, plan }: { o: ObjectiveView; plan: ObjectivePlan }) {
  const color = tone(o.color).fg;
  const toggle = useToggleObjectiveToday();
  const when = timeText(o, plan);
  const canTick = !o.completed_at && plan.status !== "upcoming";
  const basis =
    o.outputs_total > 0
      ? d.pctByOutputs(o.outputs_done, o.outputs_total)
      : plan.plannedTotal
        ? d.pctBySessions(o.total_sessions, plan.plannedTotal)
        : d.pctNone;

  const onTick = async () => {
    try {
      await toggle.mutateAsync(o.id);
    } catch {
      toast.error(d.errors.save);
    }
  };

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-8 card rounded-[28px] p-6 md:px-8 md:py-7">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
        <div className="flex flex-wrap items-center gap-3">
          <IconTile icon={o.icon} color={o.color} size={44} />
          <StatusBadge status={plan.status} />
          {when && <span className="text-[13px] text-muted-foreground">{when}</span>}
        </div>
        {o.why && (
          <p className="m-0 text-sm leading-relaxed text-soft">
            <span className="sr-only">{d.why}: </span>
            {o.why}
          </p>
        )}
        <div className="flex flex-col gap-2 pb-[22px]">
          <span className="text-[13px] text-muted-foreground">{basis}</span>
          <ProgressBar
            value={plan.pct ?? 0}
            color={color}
            height={12}
            marker={o.completed_at ? null : plan.timePct}
            markerLabel={plan.timePct !== null ? d.timeMarker(plan.timePct) : undefined}
            label={`${plan.pct ?? 0}% ${d.ofTarget}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-surface-2 pt-4 sm:grid-cols-4">
          <Stat label={d.start} value={formatDate(o.start_on)} />
          <Stat label={d.deadline} value={o.end_on ? formatDate(o.end_on) : d.noDeadline} />
          <Stat label={d.week} value={d.weekValue(plan.weekNo, plan.weeksTotal)} />
          <Stat label={d.sessions} value={d.sessionsValue(o.total_sessions)} accent />
        </div>
        {canTick && (
          <Button
            variant={o.done_today ? "secondary" : "primary"}
            size="md"
            className="min-h-12 w-full sm:w-fit sm:px-6"
            aria-pressed={o.done_today}
            onClick={onTick}
          >
            <Check className="size-[18px]" strokeWidth={3} aria-hidden />
            {o.done_today ? d.tickedToday : d.tickToday}
          </Button>
        )}
      </div>
      <ProgressRing
        value={plan.pct ?? 0}
        size={160}
        stroke={12}
        color={color}
        className="mx-auto md:mx-0"
      >
        <span className="font-display text-[44px] font-bold tracking-[-2px]">
          {plan.pct === null ? "—" : `${plan.pct}%`}
        </span>
        <span className="mt-1.5 text-xs text-muted-foreground">{d.ofTarget}</span>
      </ProgressRing>
    </div>
  );
}

function PlanCard({ o, plan }: { o: ObjectiveView; plan: ObjectivePlan }) {
  const sessions = useObjectiveSessions(o.id);
  const color = tone(o.color).fg;
  const per = o.sessions_per_week;
  const weeks = weekBuckets(sessions.data ?? [], o.today, 8);
  const max = Math.max(1, per ?? 0, ...weeks.map((w) => w.count));

  return (
    <div className="flex flex-col gap-[18px] card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-[15px] font-semibold">{d.plan}</h2>
        {per && (
          <span className="text-[13px] text-muted-foreground">
            {[d.pace(per), plan.plannedTotal ? d.plannedTotal(plan.plannedTotal) : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </div>

      {per ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-2xl bg-bg px-4 py-3.5">
            <span className="text-[11px] text-muted-foreground">{d.thisWeek}</span>
            <span className="font-display text-xl font-bold">
              {o.week_count}/{per}
            </span>
            <span className="text-xs text-muted-foreground">{d.weekLeft(plan.weekLeft ?? 0)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-bg px-4 py-3.5">
            <span className="text-[11px] text-muted-foreground">{d.versusPlan}</span>
            <span
              className={cn(
                "font-display text-lg font-bold",
                (plan.gap ?? 0) < 0 ? "text-cat-orange" : "text-cat-green",
              )}
            >
              {(plan.gap ?? 0) > 0
                ? d.ahead(plan.gap!)
                : (plan.gap ?? 0) < 0
                  ? d.behind(-plan.gap!)
                  : d.onPace}
            </span>
            <span className="text-xs text-muted-foreground">
              {d.versusHint(o.total_sessions, plan.expected ?? 0)}
            </span>
          </div>
        </div>
      ) : (
        <p className="m-0 text-[13px] text-muted-foreground">{d.noPace}</p>
      )}

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[13px] font-medium">{d.chart}</span>
          {per && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                aria-hidden
                className="w-3 border-t-[1.5px] border-dashed border-muted-foreground"
              />
              {d.chartTarget(per)}
            </span>
          )}
        </div>
        {sessions.isLoading ? (
          <div className="h-[120px] animate-pulse rounded-2xl bg-surface-2/50" />
        ) : sessions.isError ? (
          <ErrorState onRetry={() => sessions.refetch()} className="py-4" />
        ) : (
          <figure className="m-0 flex flex-col gap-2" aria-label={d.chartLabel}>
            <div className="relative grid h-[120px] grid-cols-8 items-end gap-2.5">
              {per && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 border-t-[1.5px] border-dashed border-muted-foreground/70"
                  style={{ bottom: `${(per * 100) / max}%` }}
                />
              )}
              {weeks.map((w) => (
                <div
                  key={w.start}
                  className="flex h-full flex-col justify-end"
                  title={d.chartBar(formatDayMonth(w.start), w.count)}
                >
                  <div
                    className="rounded-[8px_8px_4px_4px]"
                    style={{
                      height: `${(w.count * 100) / max}%`,
                      minHeight: w.count > 0 ? 4 : 0,
                      background: color,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-2.5 text-center text-[11px] text-muted-foreground">
              {weeks.map((w, i) => (
                <span key={w.start} className={cn(i === weeks.length - 1 && "text-text")}>
                  {formatDayMonth(w.start)}
                </span>
              ))}
            </div>
            <figcaption className="sr-only">
              {weeks.map((w) => d.chartBar(formatDayMonth(w.start), w.count)).join(", ")}
            </figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}

function OutputsCard({ o }: { o: ObjectiveView }) {
  const outputs = useObjectiveOutputs(o.id);
  const add = useAddObjectiveOutput();
  const toggle = useToggleObjectiveOutput(o.id);
  const remove = useDeleteObjectiveOutput();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string>();
  const list = outputs.data ?? [];

  const onAdd = async () => {
    if (!title.trim()) return setError(d.errors.outputTitle);
    setError(undefined);
    try {
      await add.mutateAsync({
        objective_id: o.id,
        title: title.trim(),
        due_on: due || null,
        sort_order: list.length,
      });
      setTitle("");
      setDue("");
    } catch {
      toast.error(d.errors.save);
    }
  };

  const run = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch {
      toast.error(d.errors.save);
    }
  };

  return (
    <div className="flex flex-col gap-3 card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[15px] font-semibold">{d.outputs}</h2>
        {list.length > 0 && (
          <span className="text-[13px] text-muted-foreground">
            {t.objectives.outputsCount(list.filter((x) => x.done_at).length, list.length)}
          </span>
        )}
      </div>

      {outputs.isLoading ? (
        <RowsSkeleton />
      ) : outputs.isError ? (
        <ErrorState onRetry={() => outputs.refetch()} className="py-4" />
      ) : list.length === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">{d.outputsEmpty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {list.map((x) => {
            const done = Boolean(x.done_at);
            const late = !done && x.due_on !== null && x.due_on < o.today;
            return (
              <li
                key={x.id}
                className="flex items-center gap-2 border-b border-surface-2 py-1.5 last:border-b-0"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={done ? d.untickOutput(x.title) : d.tickOutput(x.title)}
                  onClick={() => run(toggle.mutateAsync({ id: x.id, done: !done }))}
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                      done ? "border-accent bg-accent text-bg" : "border-border-strong bg-bg",
                    )}
                  >
                    {done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                  </span>
                </button>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className={cn("text-sm", done && "text-muted-foreground line-through")}>
                    {x.title}
                  </span>
                  {(x.due_on || done) && (
                    <span
                      className={cn(
                        "text-xs",
                        late ? "font-medium text-cat-red" : "text-muted-foreground",
                      )}
                    >
                      {done
                        ? d.doneOn(formatDayMonth(x.done_at!.slice(0, 10)))
                        : late
                          ? d.overdue(formatDayMonth(x.due_on!))
                          : d.dueOn(formatDayMonth(x.due_on!))}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={d.deleteOutput(x.title)}
                  onClick={() => run(remove.mutateAsync(x.id))}
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-dim hover:text-cat-red"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void onAdd();
        }}
        className="flex flex-col gap-2 border-t border-surface-2 pt-3"
      >
        <input
          aria-label={d.outputTitle}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={d.outputPlaceholder}
          className={inputCls}
        />
        <div className="flex gap-2">
          <input
            type="date"
            aria-label={d.outputDue}
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={cn(inputCls, "grow")}
          />
          <Button
            type="submit"
            variant="secondary"
            className="min-h-11 shrink-0"
            disabled={add.isPending}
          >
            <Plus className="size-4" aria-hidden />
            {d.addOutput}
          </Button>
        </div>
      </form>
      {error && <p className="m-0 text-xs text-cat-red">{error}</p>}
    </div>
  );
}

export function ObjectiveDetail({ id }: { id: string }) {
  const q = useObjective(id);
  const openObjective = useUi((s) => s.openObjective);
  const complete = useCompleteObjective();

  const breadcrumb = (
    <nav
      aria-label={d.breadcrumb}
      className="flex items-center gap-2 text-[13px] text-muted-foreground"
    >
      <Link href="/objectives" className="text-muted-foreground no-underline hover:text-text">
        {t.objectives.title}
      </Link>
      <span aria-hidden>/</span>
      <span className="truncate text-text" aria-current="page">
        {q.data?.title ?? "…"}
      </span>
    </nav>
  );

  if (q.isLoading) {
    return (
      <>
        <PageHeader title="…" breadcrumb={breadcrumb} />
        <CardSkeleton className="min-h-[260px] rounded-[28px]" lines={5} />
      </>
    );
  }
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) {
    return (
      <div className="relative card">
        <EmptyState
          icon={Target}
          title={d.notFound}
          action={
            <Link href="/objectives" className={buttonVariants({ variant: "secondary" })}>
              {d.back}
            </Link>
          }
        />
      </div>
    );
  }

  const o = q.data;
  const plan = objectivePlan(o);
  const onComplete = async () => {
    const done = !o.completed_at;
    try {
      await complete.mutateAsync({ id: o.id, done });
      toast.success(done ? d.completed : d.reopened);
    } catch {
      toast.error(d.errors.save);
    }
  };

  return (
    <>
      <PageHeader
        title={o.title}
        breadcrumb={breadcrumb}
        actions={
          <>
            <Button variant="secondary" onClick={() => openObjective(o)}>
              <Pencil className="size-4" aria-hidden />
              {d.edit}
            </Button>
            <Button
              variant={o.completed_at ? "secondary" : "primary"}
              onClick={onComplete}
              disabled={complete.isPending}
            >
              {o.completed_at ? (
                <RotateCcw className="size-4" aria-hidden />
              ) : (
                <CircleCheck className="size-4" aria-hidden />
              )}
              {o.completed_at ? d.reopen : d.complete}
            </Button>
          </>
        }
      />
      <Hero o={o} plan={plan} />
      <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-5">
        <OutputsCard o={o} />
        <PlanCard o={o} plan={plan} />
      </div>
    </>
  );
}
