"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { IconTile } from "@/components/common/icon-tile";
import { StackedBar } from "@/components/common/progress-bar";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { SearchBox, TransactionList } from "@/components/expenses/transaction-list";
import { useBills } from "@/hooks/use-bills";
import { useFundMonth } from "@/hooks/use-funds";
import { useLookups } from "@/hooks/use-lookups";
import { useMonth } from "@/hooks/use-month";
import { useMonthSummary, useTransactions } from "@/hooks/use-transactions";
import { buttonVariants } from "@/components/ui/button";
import { tone } from "@/lib/colors";
import { formatDayMonth, formatMonth } from "@/lib/dates";
import { formatCompact, formatMillions, formatNumber, formatVND } from "@/lib/money";
import type { MonthSummary } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

export function BudgetHighlight() {
  const { month, isCurrent } = useMonth();
  const summary = useMonthSummary(month);
  const budgets = useFundMonth(month);
  const { defaultFund } = useLookups();
  const openFund = useUi((s) => s.openFund);

  if (summary.isLoading || budgets.isLoading) return <CardSkeleton className="min-h-[188px]" />;
  if (summary.isError || budgets.isError) {
    return (
      <div className="card">
        <ErrorState onRetry={() => (summary.refetch(), budgets.refetch())} />
      </div>
    );
  }

  const spent = summary.data?.total_expense ?? 0;
  const budget = budgets.data?.find((b) => b.fund_id === defaultFund?.id) ?? budgets.data?.[0];
  const pct = budget?.pct_used ?? null;

  return (
    <div className="flex flex-col gap-4 card-highlight rounded-[28px] p-6 md:rounded-3xl">
      <span className="text-[11px] font-semibold tracking-[1.2px] uppercase opacity-75">
        {isCurrent
          ? t.expenses.spentThisMonth
          : t.expenses.spentInMonth(formatMonth(month).split(" · ")[0])}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="num-xl text-[46px] md:text-[42px]">{formatNumber(spent)}</span>
        <span className="font-display text-[22px] font-bold md:text-xl">₫</span>
      </div>
      {budget?.monthly_budget ? (
        <div className="flex flex-col gap-2">
          <div className="h-2 overflow-hidden rounded bg-bg/15">
            <div
              className="h-full rounded bg-bg"
              style={{ width: `${Math.min(100, pct ?? 0)}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[13px] font-medium whitespace-nowrap">
            <span className="opacity-80">
              {t.expenses.budgetPct(Math.round(pct ?? 0), formatMillions(budget.monthly_budget))}
            </span>
            <span className="font-semibold">
              {(budget.remaining ?? 0) >= 0
                ? t.expenses.budgetLeft(formatVND(budget.remaining ?? 0))
                : t.expenses.budgetOver(formatVND(-(budget.remaining ?? 0)))}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 text-[13px] font-medium">
          <span className="opacity-80">{t.expenses.noBudget}</span>
          {defaultFund && (
            <button
              type="button"
              onClick={() => openFund(defaultFund)}
              className="min-h-9 cursor-pointer rounded-full border-0 bg-bg px-3.5 text-xs font-semibold text-accent"
            >
              {t.expenses.setBudget}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function topCategories(summary: MonthSummary | undefined) {
  const list = summary?.by_category ?? [];
  if (list.length <= 4)
    return list.map((c) => ({
      key: c.category_id,
      name: c.name,
      amount: c.amount,
      color: c.color,
    }));
  const head = list
    .slice(0, 3)
    .map((c) => ({ key: c.category_id, name: c.name, amount: c.amount, color: c.color }));
  const rest = list.slice(3).reduce((s, c) => s + c.amount, 0);
  return [...head, { key: "rest", name: t.expenses.rest, amount: rest, color: "slate" as const }];
}

function CategoryCard() {
  const { month } = useMonth();
  const summary = useMonthSummary(month);
  if (summary.isLoading) return <CardSkeleton />;
  const items = topCategories(summary.data);

  return (
    <div className="@container flex flex-col gap-4 md:card md:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-semibold">{t.expenses.byCategory}</h2>
        <Link href="/expenses/transactions" className="text-[13px] font-medium no-underline">
          {t.expenses.seeAll}
        </Link>
      </div>
      {summary.isError ? (
        <ErrorState onRetry={() => summary.refetch()} className="py-4" />
      ) : items.length === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">{t.expenses.noSpending}</p>
      ) : (
        <>
          <StackedBar
            label={t.expenses.byCategory}
            segments={items.map((c) => ({ key: c.key, value: c.amount, color: tone(c.color).fg }))}
          />
          <ul className="m-0 grid list-none grid-cols-2 gap-x-5 gap-y-2.5 p-0 text-[13px]">
            {items.map((c) => (
              <li key={c.key} className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: tone(c.color).fg }}
                />
                <span className="grow truncate text-muted-foreground">{c.name}</span>
                <span className="font-display font-bold @[400px]:hidden">
                  {formatCompact(c.amount)}
                </span>
                <span className="hidden font-display font-bold @[400px]:inline">
                  {formatNumber(c.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function BillsCard() {
  const q = useBills();
  const { catById } = useLookups();
  const bills = (q.data ?? [])
    .filter((b) => b.active)
    .sort((a, b) => a.days_left - b.days_left)
    .slice(0, 3);
  return (
    <div className="hidden flex-col gap-4 card p-6 md:flex">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-semibold">{t.expenses.upcomingBills}</h2>
        <Link href="/bills" className="text-[13px] font-medium no-underline">
          {t.expenses.allBills}
        </Link>
      </div>
      {q.isLoading ? null : bills.length === 0 ? (
        <EmptyState
          icon={Zap}
          title={t.expenses.noBills}
          body={t.expenses.noBillsBody}
          className="py-2"
          action={
            <Link href="/bills" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              {t.expenses.addBill}
            </Link>
          }
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {bills.map((b) => {
            const cat = b.category_id ? catById.get(b.category_id) : undefined;
            return (
              <li key={b.id}>
                <Link
                  href="/bills"
                  className="flex items-center gap-3 text-text no-underline hover:text-text"
                >
                  <IconTile icon={cat?.icon ?? "zap"} color={cat?.color ?? "green"} size={36} />
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{b.name}</span>
                    <span
                      className={cn(
                        "text-xs text-muted-foreground",
                        b.days_left < 0 && "text-danger",
                      )}
                    >
                      {b.days_left < 0
                        ? `${t.bills.due(formatDayMonth(b.next_run_on))} · ${t.bills.overdueBy(-b.days_left)}`
                        : t.expenses.billDue(formatDayMonth(b.next_run_on), b.days_left)}
                    </span>
                  </span>
                  <span className="font-display text-sm font-bold">{formatNumber(b.amount)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecentTransactions() {
  const { range } = useMonth();
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const q = useTransactions({ ...range, search: deferred || undefined, limit: 12 });
  return (
    <div className="relative flex flex-col md:card md:px-6 md:pt-2 md:pb-3">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 md:py-4">
        <h2 className="m-0 text-[15px] font-semibold">{t.expenses.recent}</h2>
        <SearchBox value={search} onChange={setSearch} className="w-full sm:w-auto" />
      </div>
      <TransactionList
        transactions={q.data}
        isLoading={q.isLoading}
        isError={q.isError}
        onRetry={() => q.refetch()}
        searching={Boolean(deferred)}
      />
    </div>
  );
}

export function ExpensesOverview() {
  return (
    <>
      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] md:gap-5">
        <BudgetHighlight />
        <CategoryCard />
        <BillsCard />
      </div>
      <RecentTransactions />
    </>
  );
}
