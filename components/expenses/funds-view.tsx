"use client";

import { ArrowLeftRight, PiggyBank, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { IconTile } from "@/components/common/icon-tile";
import { ProgressBar } from "@/components/common/progress-bar";
import { CardSkeleton, EmptyState, ErrorState, RowsSkeleton } from "@/components/common/states";
import { useCountdowns } from "@/hooks/use-countdowns";
import { useFundMonth, useFunds, useGoals } from "@/hooks/use-funds";
import { useLookups } from "@/hooks/use-lookups";
import { useMonth } from "@/hooks/use-month";
import { useProfile } from "@/hooks/use-profile";
import { useMonthSummary, useTransactions } from "@/hooks/use-transactions";
import { tone } from "@/lib/colors";
import { formatDateTime, formatMonth } from "@/lib/dates";
import { formatMillions, formatNumber, formatSigned, formatVND } from "@/lib/money";
import type { FundMonth, FundWithBalance, GoalProgress } from "@/lib/supabase/types";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

function SummaryCard() {
  const { month } = useMonth();
  const funds = useFunds();
  const profile = useProfile();
  const summary = useMonthSummary(profile.data?.id, month);
  if (funds.isLoading) return <CardSkeleton className="flex-[1_1_320px]" />;
  const list = funds.data ?? [];
  const total = list.reduce((s, f) => s + f.balance, 0);
  const stats = [
    { label: t.funds.incomeMonth, value: formatSigned(summary.data?.total_income ?? 0, "+") },
    { label: t.funds.expenseMonth, value: formatSigned(summary.data?.total_expense ?? 0, "-") },
    { label: t.funds.savedMonth, value: formatNumber(summary.data?.total_saved ?? 0) },
  ];
  return (
    <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px] card-highlight p-6">
      <span className="text-[11px] font-semibold tracking-[1.2px] uppercase opacity-75">
        {t.funds.totalBalance(list.length)}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="num-xl text-[42px]">{formatNumber(total)}</span>
        <span className="font-display text-xl font-bold">₫</span>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-3 border-t border-bg/15 pt-3.5">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold opacity-70">{s.label}</span>
            <span className="font-display text-[15px] font-bold tracking-[-0.3px] break-all">
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function progressFor(f: FundWithBalance, budget?: FundMonth, goal?: GoalProgress) {
  if (f.kind === "monthly_budget") {
    if (!budget?.monthly_budget) return { pct: null, text: t.funds.noBudgetSet };
    const pct = Math.round(budget.pct_used ?? 0);
    return { pct, text: t.funds.usedPct(pct, budget.days_left) };
  }
  if (f.kind === "goal" && goal) {
    const pct = Math.round(goal.pct);
    if (goal.remaining === 0) return { pct: 100, text: t.funds.goalDone };
    const need = goal.per_period ? t.funds.goalNeed(formatMillions(goal.per_period)) : "";
    return { pct, text: t.funds.goalPct(pct, formatMillions(goal.target_amount)) + need };
  }
  return { pct: null, text: t.funds.freeHint };
}

function FundCard({
  fund,
  budget,
  goal,
  countdownDays,
}: {
  fund: FundWithBalance;
  budget?: FundMonth;
  goal?: GoalProgress;
  countdownDays?: number;
}) {
  const openFund = useUi((s) => s.openFund);
  const p = progressFor(fund, budget, goal);
  const color = tone(fund.color).fg;
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <IconTile icon={fund.icon} color={fund.color} size={40} />
        {fund.is_default ? (
          <span className="rounded-[9px] bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-soft">
            {t.funds.defaultBadge}
          </span>
        ) : countdownDays !== undefined ? (
          <span className="rounded-[9px] bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-soft">
            {t.funds.countdownBadge(countdownDays)}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className="truncate text-sm font-semibold">{fund.name}</span>
        <span className="truncate font-display text-2xl font-bold tracking-[-0.8px]">
          {formatVND(fund.balance)}
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        {p.pct !== null && <ProgressBar value={p.pct} color={color} label={p.text} />}
        <span className="text-xs text-muted-foreground">{p.text}</span>
      </div>
    </>
  );
  const cls =
    "card flex min-h-[170px] flex-col gap-3.5 rounded-[22px] p-5 text-left text-text no-underline transition-colors hover:border-border-strong hover:text-text";
  return fund.kind === "goal" ? (
    <Link href={`/expenses/funds/${fund.id}`} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={() => openFund(fund)} className={`${cls} cursor-pointer`}>
      {body}
    </button>
  );
}

function FundGrid() {
  const { month } = useMonth();
  const funds = useFunds();
  const budgets = useFundMonth(month);
  const goals = useGoals();
  const countdowns = useCountdowns();
  const openFund = useUi((s) => s.openFund);

  if (funds.isError) {
    return (
      <div className="flex-[2_1_480px] card">
        <ErrorState onRetry={() => funds.refetch()} />
      </div>
    );
  }
  return (
    <div className="grid min-w-0 flex-[2_1_480px] grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5">
      {funds.isLoading
        ? Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} className="min-h-[170px] rounded-[22px]" />
          ))
        : (funds.data ?? []).map((f) => {
            const cd = f.countdown_id
              ? countdowns.data?.find((c) => c.id === f.countdown_id)
              : undefined;
            return (
              <FundCard
                key={f.id}
                fund={f}
                budget={budgets.data?.find((b) => b.fund_id === f.id)}
                goal={goals.data?.find((g) => g.fund_id === f.id)}
                countdownDays={cd && !cd.is_past ? cd.days_left : undefined}
              />
            );
          })}
      <button
        type="button"
        onClick={() => openFund(null)}
        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-border-strong bg-transparent text-[13px] font-medium text-muted-foreground hover:border-border hover:text-text"
      >
        <Plus className="size-5" aria-hidden />
        {t.funds.create}
      </button>
    </div>
  );
}

function IncomeCard() {
  const { month, range } = useMonth();
  const { fundById, catById } = useLookups();
  const q = useTransactions({ ...range, types: ["income"], limit: 50 });
  const editTx = useUi((s) => s.editTx);
  const total = (q.data ?? []).reduce((s, x) => s + x.amount, 0);
  return (
    <div className="flex flex-col card px-6 pt-2 pb-3">
      <div className="flex items-center justify-between gap-3 pt-4 pb-1.5">
        <h2 className="m-0 text-[15px] font-semibold">
          {t.funds.incomeTitle(formatMonth(month).split(" · ")[0])}
        </h2>
        <span className="font-display text-[15px] font-bold text-cat-green">
          {formatSigned(total, "+")} ₫
        </span>
      </div>
      {q.isLoading ? (
        <RowsSkeleton rows={2} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={TrendingUp} title={t.funds.noIncome} className="py-6" />
      ) : (
        q.data.map((tx) => {
          const cat = tx.category_id ? catById.get(tx.category_id) : undefined;
          return (
            <button
              key={tx.id}
              type="button"
              onClick={() => !tx.id.startsWith("optimistic-") && editTx(tx)}
              className="flex cursor-pointer items-center gap-3.5 border-0 border-t border-solid border-surface-2 bg-transparent py-[13px] text-left text-text"
            >
              <IconTile icon={cat?.icon ?? "banknote"} color={cat?.color ?? "green"} size={40} />
              <span className="flex min-w-0 grow flex-col gap-[3px]">
                <span className="truncate text-sm font-medium">{tx.note || cat?.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatDateTime(tx.occurred_at)}{" "}
                  {t.funds.into(fundById.get(tx.fund_id)?.name ?? "—")}
                </span>
              </span>
              <span className="font-display text-[15px] font-bold text-cat-green">
                {formatSigned(tx.amount, "+")}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

function TransfersCard() {
  const { fundById } = useLookups();
  const q = useTransactions({ types: ["transfer"], limit: 6 });
  const editTx = useUi((s) => s.editTx);
  return (
    <div className="flex flex-col card px-6 pt-2 pb-3">
      <div className="flex items-center justify-between pt-4 pb-1.5">
        <h2 className="m-0 text-[15px] font-semibold">{t.funds.transfersTitle}</h2>
        <Link
          href="/expenses/transactions?type=transfer"
          className="text-[13px] font-medium no-underline"
        >
          {t.expenses.seeAll}
        </Link>
      </div>
      {q.isLoading ? (
        <RowsSkeleton rows={2} />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={ArrowLeftRight} title={t.funds.noTransfers} className="py-6" />
      ) : (
        q.data.map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => !tx.id.startsWith("optimistic-") && editTx(tx)}
            className="flex cursor-pointer items-center gap-3.5 border-0 border-t border-solid border-surface-2 bg-transparent py-[13px] text-left text-text"
          >
            <IconTile icon="arrow-left-right" color="slate" size={40} />
            <span className="flex min-w-0 grow flex-col gap-[3px]">
              <span className="truncate text-sm font-medium">
                {t.funds.arrow(
                  fundById.get(tx.fund_id)?.name ?? "—",
                  fundById.get(tx.to_fund_id ?? "")?.name ?? "—",
                )}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {[
                  formatDateTime(tx.occurred_at),
                  tx.source === "auto" ? t.funds.autoAfterSalary : tx.note,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="font-display text-[15px] font-bold">{formatNumber(tx.amount)}</span>
          </button>
        ))
      )}
    </div>
  );
}

export function FundsView() {
  const funds = useFunds();
  const openFund = useUi((s) => s.openFund);
  if (!funds.isLoading && !funds.isError && funds.data?.length === 0) {
    return (
      <div className="relative card">
        <EmptyState
          icon={PiggyBank}
          title={t.funds.empty}
          action={
            <button
              type="button"
              onClick={() => openFund(null)}
              className="min-h-11 cursor-pointer rounded-full border-0 bg-accent px-5 text-[13px] font-semibold text-bg"
            >
              {t.funds.create}
            </button>
          }
        />
      </div>
    );
  }
  return (
    <>
      <div className="relative flex flex-wrap items-stretch gap-5">
        <SummaryCard />
        <FundGrid />
      </div>
      <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-5">
        <IncomeCard />
        <TransfersCard />
      </div>
    </>
  );
}
