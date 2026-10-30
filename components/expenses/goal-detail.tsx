"use client";

import { ArrowLeftRight, CircleCheck, Pencil, Timer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { IconTile } from "@/components/common/icon-tile";
import { ProgressBar } from "@/components/common/progress-bar";
import { ProgressRing } from "@/components/common/progress-ring";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { PageHeader } from "@/components/layout/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCountdowns } from "@/hooks/use-countdowns";
import { useFund, useFundInflow, useGoal, useUpdateFund } from "@/hooks/use-funds";
import { useLookups } from "@/hooks/use-lookups";
import { useTransactions } from "@/hooks/use-transactions";
import { tone } from "@/lib/colors";
import { addMonths, formatDate, formatDayMonth, formatMonthTick, monthStart } from "@/lib/dates";
import { formatNumber, formatSigned, formatVND } from "@/lib/money";
import type { FundWithBalance, GoalProgress } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";
import { forecastScenarios, type Scenario } from "@/supabase/functions/_shared/goal.ts";

function StatusBadge({ goal }: { goal: GoalProgress }) {
  if (goal.remaining === 0) {
    return (
      <span className="flex items-center gap-1.5 rounded-[11px] bg-cat-green-bg px-[11px] py-1.5 text-xs font-semibold text-cat-green">
        <CircleCheck className="size-3.5" aria-hidden />
        {t.goal.done}
      </span>
    );
  }
  if (goal.expected_pct === null) {
    return (
      <span className="rounded-[11px] bg-surface-2 px-[11px] py-1.5 text-xs font-semibold text-soft">
        {t.goal.noDeadline}
      </span>
    );
  }
  return goal.behind_schedule ? (
    <span className="flex items-center gap-1.5 rounded-[11px] bg-cat-orange-bg px-[11px] py-1.5 text-xs font-semibold text-cat-orange">
      <TriangleAlert className="size-3.5" aria-hidden />
      {t.goal.behind}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 rounded-[11px] bg-cat-green-bg px-[11px] py-1.5 text-xs font-semibold text-cat-green">
      <CircleCheck className="size-3.5" aria-hidden />
      {t.goal.onTrack}
    </span>
  );
}

function Hero({ fund, goal }: { fund: FundWithBalance; goal: GoalProgress }) {
  const countdowns = useCountdowns();
  const linked = countdowns.data?.find((c) => c.id === goal.countdown_id);
  const color = tone(fund.color).fg;
  const pct = Math.round(goal.pct);
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-8 card rounded-[28px] p-6 md:px-8 md:py-7">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
        <div className="flex flex-wrap items-center gap-3">
          <IconTile icon={fund.icon} color={fund.color} size={44} />
          <StatusBadge goal={goal} />
          {linked && (
            <span className="rounded-[11px] bg-surface-2 px-[11px] py-1.5 text-xs font-semibold text-soft">
              {t.goal.linkedCountdown(linked.title)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="num-xl text-[40px] md:text-[44px]">
            {formatNumber(goal.contributed)}
          </span>
          <span className="font-display text-xl font-bold text-muted-foreground">
            / {formatVND(goal.target_amount)}
          </span>
        </div>
        <div className="pb-[22px]">
          <ProgressBar
            value={goal.pct}
            color={color}
            height={12}
            marker={goal.remaining > 0 ? goal.expected_pct : null}
            markerLabel={
              goal.expected_pct !== null
                ? t.goal.expected(Math.round(goal.expected_pct))
                : undefined
            }
            label={`${pct}% ${t.goal.ofTarget}`}
          />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-4 border-t border-surface-2 pt-4">
          <div className="flex flex-col gap-[3px]">
            <span className="text-[11px] text-muted-foreground">{t.goal.missing}</span>
            <span className="font-display text-lg font-bold">{formatVND(goal.remaining)}</span>
          </div>
          <div className="flex flex-col gap-[3px]">
            <span className="text-[11px] text-muted-foreground">{t.goal.deadline}</span>
            <span className="font-display text-lg font-bold">
              {goal.deadline && goal.days_left !== null
                ? t.goal.deadlineValue(formatDate(goal.deadline), Math.max(0, goal.days_left))
                : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-[3px]">
            <span className="text-[11px] text-muted-foreground">{t.goal.perPeriod}</span>
            <span className="font-display text-lg font-bold text-accent">
              {goal.per_period !== null
                ? t.goal.perPeriodValue(formatVND(goal.per_period), goal.periods_left)
                : "—"}
            </span>
          </div>
        </div>
      </div>
      <ProgressRing
        value={goal.pct}
        size={160}
        stroke={12}
        color={color}
        className="mx-auto md:mx-0"
      >
        <span className="font-display text-[44px] font-bold tracking-[-2px]">{pct}%</span>
        <span className="mt-1.5 text-xs text-muted-foreground">{t.goal.ofTarget}</span>
      </ProgressRing>
    </div>
  );
}

function scenarioText(s: Scenario, goal: GoalProgress) {
  const deadline = goal.deadline ? formatDayMonth(goal.deadline) : "";
  if (s.kind === "keep") {
    const missing = Math.max(0, goal.target_amount - s.projected);
    return {
      title: t.goal.scenario.keep(formatVND(s.perPeriod)),
      body: t.goal.scenario.keepBody(formatVND(s.projected), missing ? formatVND(missing) : ""),
      apply: t.goal.apply.keep(formatVND(s.perPeriod)),
    };
  }
  if (s.kind === "increase") {
    return {
      title: t.goal.scenario.increase(formatVND(s.perPeriod)),
      body: t.goal.scenario.increaseBody(formatVND(goal.target_amount), deadline),
      apply: t.goal.apply.increase(formatVND(s.perPeriod)),
    };
  }
  return {
    title: t.goal.scenario.lower(formatVND(s.target)),
    body: t.goal.scenario.lowerBody(formatVND(s.perPeriod)),
    apply: t.goal.apply.lower(formatVND(s.target)),
  };
}

function scenariosFor(goal: GoalProgress) {
  const pace = goal.auto_contribution ?? goal.avg_monthly_contribution;
  if (goal.per_period === null || goal.remaining === 0) return { pace, list: [] as Scenario[] };
  return {
    pace,
    list: forecastScenarios({
      target: goal.target_amount,
      contributed: goal.contributed,
      periods: goal.periods_left,
      pace,
      perPeriod: goal.per_period,
    }),
  };
}

function Forecast({
  goal,
  selected,
  onSelect,
}: {
  goal: GoalProgress;
  selected: Scenario["kind"];
  onSelect: (k: Scenario["kind"]) => void;
}) {
  const { list } = scenariosFor(goal);
  const { defaultFund } = useLookups();
  const update = useUpdateFund();
  const current = list.find((s) => s.kind === selected) ?? list[0];

  const apply = async () => {
    if (!current) return;
    const patch =
      current.kind === "lower"
        ? { target_amount: current.target }
        : current.perPeriod > 0 && defaultFund && defaultFund.id !== goal.fund_id
          ? {
              auto_contribution: current.perPeriod,
              auto_from_fund_id: goal.auto_from_fund_id ?? defaultFund.id,
            }
          : null;
    if (!patch) return;
    try {
      await update.mutateAsync({ id: goal.fund_id, patch });
      toast.success(t.goal.applied);
    } catch {
      toast.error(t.fundDialog.errors.save);
    }
  };

  return (
    <div className="flex flex-col gap-[18px] card p-6">
      <h2 className="m-0 text-[15px] font-semibold">{t.goal.forecast}</h2>
      {goal.remaining === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">{t.goal.forecastDone}</p>
      ) : list.length === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">{t.goal.forecastNeedsDeadline}</p>
      ) : (
        <>
          <div role="radiogroup" aria-label={t.goal.scenarioLabel} className="flex flex-col gap-3">
            {list.map((s) => {
              const text = scenarioText(s, goal);
              const active = s.kind === current?.kind;
              const pctColor =
                s.kind === "increase"
                  ? "var(--accent)"
                  : s.kind === "keep"
                    ? "var(--cat-orange)"
                    : "var(--soft)";
              return (
                <button
                  key={s.kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSelect(s.kind)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-bg px-4 py-3.5 text-left text-text",
                    active
                      ? "border-[1.5px] border-accent"
                      : "border border-surface-2 hover:border-border",
                  )}
                >
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className={cn("text-[13px]", active ? "font-semibold" : "font-medium")}>
                      {text.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{text.body}</span>
                  </span>
                  <span
                    className="shrink-0 font-display text-lg font-bold"
                    style={{ color: pctColor }}
                  >
                    {s.pct}%
                  </span>
                </button>
              );
            })}
          </div>
          {current && (
            <Button
              size="md"
              className="min-h-[46px] whitespace-normal"
              onClick={apply}
              disabled={update.isPending || (current.kind !== "lower" && current.perPeriod <= 0)}
            >
              {current.kind === "keep" && current.perPeriod <= 0
                ? t.goal.noPace
                : scenarioText(current, goal).apply}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function ContributionChart({
  fund,
  goal,
  planned,
}: {
  fund: FundWithBalance;
  goal: GoalProgress;
  planned: number;
}) {
  const future = goal.remaining > 0 && goal.deadline ? Math.min(goal.periods_left, 4) : 0;
  const pastCount = 8 - future;
  const inflow = useFundInflow(fund.id, pastCount);
  const txs = useTransactions({ fundId: fund.id, types: ["transfer", "income"], limit: 30 });
  const color = tone(fund.color).fg;

  const past = inflow.data ?? [];
  const lastMonth = past.at(-1)?.month_start ?? monthStart(goal.today);
  const futureBars = Array.from({ length: future }, (_, i) => ({
    month_start: addMonths(lastMonth, i + 1),
    amount: planned,
  }));
  const max = Math.max(1, ...past.map((p) => p.amount), ...futureBars.map((f) => f.amount));
  const history = (txs.data ?? [])
    .filter((x) => x.to_fund_id === fund.id || x.type === "income")
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-[18px] card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-[15px] font-semibold">{t.goal.chart}</h2>
        <span className="flex items-center gap-3.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: color }} />
            {t.goal.chartLegendDone}
          </span>
          {future > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px] border-[1.5px] border-dashed border-muted-foreground"
              />
              {t.goal.chartLegendPlan}
            </span>
          )}
        </span>
      </div>
      {inflow.isLoading ? (
        <div className="h-[150px] animate-pulse rounded-2xl bg-surface-2/50" />
      ) : inflow.isError ? (
        <ErrorState onRetry={() => inflow.refetch()} className="py-4" />
      ) : (
        <figure className="m-0 flex flex-col gap-2.5" aria-label={t.goal.chartLabel}>
          <div className="grid h-[150px] grid-cols-8 items-end gap-2.5">
            {past.map((p) => (
              <div
                key={p.month_start}
                className="flex h-full flex-col justify-end"
                title={`${formatMonthTick(p.month_start)}: ${formatVND(p.amount)}`}
              >
                <div
                  className="rounded-[8px_8px_4px_4px]"
                  style={{
                    height: `${(p.amount * 100) / max}%`,
                    minHeight: p.amount > 0 ? 4 : 0,
                    background: color,
                  }}
                />
              </div>
            ))}
            {futureBars.map((p) => (
              <div
                key={p.month_start}
                className="flex h-full flex-col justify-end"
                title={`${formatMonthTick(p.month_start)}: ${formatVND(p.amount)}`}
              >
                <div
                  className="rounded-[8px_8px_4px_4px] border-[1.5px] border-dashed border-muted-foreground"
                  style={{ height: `${(p.amount * 100) / max}%`, minHeight: 4 }}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-2.5 text-center text-[11px] text-muted-foreground">
            {past.map((p) => (
              <span key={p.month_start}>{formatMonthTick(p.month_start)}</span>
            ))}
            {futureBars.map((p) => (
              <span key={p.month_start} className="text-text">
                {formatMonthTick(p.month_start)}
              </span>
            ))}
          </div>
          <figcaption className="sr-only">
            {[...past, ...futureBars]
              .map((p) => `${formatMonthTick(p.month_start)} ${formatVND(p.amount)}`)
              .join(", ")}
          </figcaption>
        </figure>
      )}
      <div className="flex flex-col border-t border-surface-2 pt-1.5">
        <span className="sr-only">{t.goal.history}</span>
        {txs.isLoading ? null : history.length === 0 ? (
          <p className="m-0 py-2.5 text-[13px] text-muted-foreground">{t.goal.historyEmpty}</p>
        ) : (
          history.map((h, i) => (
            <div
              key={h.id}
              className={cn(
                "flex items-center justify-between gap-3 py-2.5 text-[13px]",
                i > 0 && "border-t border-surface-2",
              )}
            >
              <span className="truncate text-soft">
                {formatDayMonth(h.occurred_at.slice(0, 10))} ·{" "}
                {h.source === "auto" ? t.goal.autoNote : h.note || t.expenses.untitled[h.type]}
              </span>
              <span className="font-display font-bold">{formatSigned(h.amount, "+")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function GoalDetail({ id }: { id: string }) {
  const fund = useFund(id);
  const goal = useGoal(id);
  const openFund = useUi((s) => s.openFund);
  const openTx = useUi((s) => s.openTx);
  const [selected, setSelected] = useState<Scenario["kind"]>("increase");

  const breadcrumb = (
    <nav
      aria-label={t.goal.breadcrumb}
      className="flex items-center gap-2 text-[13px] text-muted-foreground"
    >
      <Link href="/expenses" className="text-muted-foreground no-underline hover:text-text">
        {t.expenses.title}
      </Link>
      <span aria-hidden>/</span>
      <Link href="/expenses/funds" className="text-muted-foreground no-underline hover:text-text">
        {t.expenses.tabs.funds}
      </Link>
      <span aria-hidden>/</span>
      <span className="truncate text-text" aria-current="page">
        {fund.data?.name ?? "…"}
      </span>
    </nav>
  );

  if (fund.isLoading || goal.isLoading) {
    return (
      <>
        <PageHeader title="…" breadcrumb={breadcrumb} />
        <CardSkeleton className="min-h-[260px] rounded-[28px]" lines={5} />
      </>
    );
  }
  if (fund.isError || goal.isError) {
    return <ErrorState onRetry={() => (fund.refetch(), goal.refetch())} />;
  }
  if (!fund.data || !goal.data) {
    return (
      <div className="relative card">
        <EmptyState
          icon={Timer}
          title={fund.data ? t.goal.notGoal : t.goal.notFound}
          action={
            <Link href="/expenses/funds" className={buttonVariants({ variant: "secondary" })}>
              {t.goal.back}
            </Link>
          }
        />
      </div>
    );
  }

  const f = fund.data;
  const g = goal.data;
  const { list, pace } = scenariosFor(g);
  const planned =
    (list.find((s) => s.kind === selected) ?? list[0])?.perPeriod ?? g.per_period ?? pace;

  return (
    <>
      <PageHeader
        title={f.name}
        breadcrumb={breadcrumb}
        actions={
          <>
            <Button variant="secondary" onClick={() => openFund(f)}>
              <Pencil className="size-4" aria-hidden />
              {t.goal.edit}
            </Button>
            <Button onClick={() => openTx("transfer", { toFundId: f.id })}>
              <ArrowLeftRight className="size-4" aria-hidden />
              {t.goal.contribute}
            </Button>
          </>
        }
      />
      <Hero fund={f} goal={g} />
      <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-5">
        <Forecast goal={g} selected={selected} onSelect={setSelected} />
        <ContributionChart fund={f} goal={g} planned={planned} />
      </div>
    </>
  );
}
