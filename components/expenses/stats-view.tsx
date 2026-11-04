"use client";

import { BarChart3 } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { StackedBar } from "@/components/common/progress-bar";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { useLookups } from "@/hooks/use-lookups";
import { useMonth } from "@/hooks/use-month";
import { useMonthlyTotals, useMonthSummary, useTransactions } from "@/hooks/use-transactions";
import { tone } from "@/lib/colors";
import {
  addMonths,
  APP_TZ,
  daysBetween,
  formatDayMonth,
  formatMonth,
  formatMonthTick,
  formatRelativeTime,
  localDate,
} from "@/lib/dates";
import { formatCompact, formatNumber, formatVND } from "@/lib/money";
import type { MonthSummary, Transaction } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

const FLOW_MONTHS = 6;
const EXPENSE_COLOR = "var(--accent)";
const INCOME_COLOR = "var(--cat-sky)";
const MUTED_BAR = "color-mix(in oklab, var(--accent) 32%, var(--surface-2))";

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 100) / whole) : 0);

/** Ngày trong tháng (1–31) của một thời điểm, theo giờ VN. */
const dayOf = (iso: string) => Number(localDate(new Date(iso), APP_TZ).slice(8, 10));

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col gap-4 card p-5 md:p-6", className)}>{children}</div>;
}

function CardTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="m-0 text-[15px] font-semibold">{children}</h2>
      {aside && <span className="text-[12px] text-muted-foreground">{aside}</span>}
    </div>
  );
}

/** Thay đổi so với tháng trước: tăng chi là xấu, tăng thu là tốt. */
function Delta({ now, prev, upIsGood }: { now: number; prev: number; upIsGood: boolean }) {
  if (prev <= 0) return <span className="text-[12px] text-dim">{t.stats.noPrev}</span>;
  const change = Math.round(((now - prev) * 100) / prev);
  if (change === 0) return <span className="text-[12px] text-dim">{t.stats.samePrev}</span>;
  const good = change > 0 === upIsGood;
  return (
    <span className={cn("text-[12px] font-medium", good ? "text-cat-green" : "text-danger")}>
      {change > 0 ? "▲" : "▼"} {t.stats.vsPrev(Math.abs(change))}
    </span>
  );
}

function StatTile({ label, value, foot }: { label: string; value: number; foot: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 card p-4 md:p-5">
      <span className="text-[11px] font-semibold tracking-[1.2px] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-display text-[22px] font-bold tracking-[-0.5px] md:text-2xl">
          {formatNumber(value)}
        </span>
        <span className="font-display text-sm font-bold text-muted-foreground">₫</span>
      </span>
      <span className="min-h-4 leading-4">{foot}</span>
    </div>
  );
}

function Tiles({
  summary,
  prev,
  month,
  isCurrent,
  today,
}: {
  summary: MonthSummary;
  prev: MonthSummary | undefined;
  month: string;
  isCurrent: boolean;
  today: string;
}) {
  const daysInMonth = daysBetween(month, addMonths(month, 1));
  const daysCounted = isCurrent ? Number(today.slice(8, 10)) : daysInMonth;
  const perDay = summary.total_expense / Math.max(1, daysCounted);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
      <StatTile
        label={t.stats.spent}
        value={summary.total_expense}
        foot={
          <Delta now={summary.total_expense} prev={prev?.total_expense ?? 0} upIsGood={false} />
        }
      />
      <StatTile
        label={t.stats.income}
        value={summary.total_income}
        foot={<Delta now={summary.total_income} prev={prev?.total_income ?? 0} upIsGood />}
      />
      <StatTile
        label={t.stats.saved}
        value={summary.total_saved}
        foot={
          <span className="text-[12px] text-dim">
            {t.stats.savedShare(pct(summary.total_saved, summary.total_income))}
          </span>
        }
      />
      <StatTile
        label={t.stats.perDay}
        value={Math.round(perDay)}
        foot={
          <span className="text-[12px] text-dim">
            {isCurrent
              ? t.stats.forecast(formatCompact(Math.round(perDay * daysInMonth)))
              : t.stats.daysCounted(daysCounted)}
          </span>
        }
      />
    </div>
  );
}

/** Cột chi từng ngày trong tháng; ngày chi nhiều nhất được ghi ở góc. */
function DailyChart({
  txs,
  month,
  isLoading,
  isError,
  onRetry,
}: {
  txs: Transaction[];
  month: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const days = daysBetween(month, addMonths(month, 1));
  const totals = Array.from({ length: days }, () => 0);
  for (const tx of txs) totals[dayOf(tx.occurred_at) - 1] += tx.amount;
  const max = Math.max(...totals);
  const peakDay = totals.indexOf(max) + 1;
  const monthTotal = totals.reduce((s, v) => s + v, 0);
  const fixed = txs.filter((x) => x.recurring_rule_id).reduce((s, x) => s + x.amount, 0);
  const flexible = monthTotal - fixed;
  const dateOf = (d: number) => `${month.slice(0, 8)}${String(d).padStart(2, "0")}`;
  const ticks = [1, 5, 10, 15, 20, 25, days].filter((d, i, a) => a.indexOf(d) === i);

  return (
    <Card>
      <CardTitle
        aside={max > 0 ? t.stats.peak(formatDayMonth(dateOf(peakDay)), formatCompact(max)) : null}
      >
        {t.stats.daily}
      </CardTitle>
      {isLoading ? (
        <div className="h-[150px] animate-pulse rounded-2xl bg-surface-2/50" />
      ) : isError ? (
        <ErrorState onRetry={onRetry} className="py-4" />
      ) : monthTotal === 0 ? (
        <p className="m-0 py-6 text-center text-[13px] text-muted-foreground">
          {t.expenses.noSpending}
        </p>
      ) : (
        <>
          <figure className="m-0 flex flex-col gap-1.5" aria-label={t.stats.dailyLabel}>
            <div
              className="grid h-[130px] items-end gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
            >
              {totals.map((v, i) => (
                <span
                  key={i}
                  title={t.stats.dayBar(formatDayMonth(dateOf(i + 1)), formatVND(v))}
                  className="flex h-full items-end"
                >
                  <span
                    className="w-full rounded-t-[3px]"
                    style={{
                      height: `${(v * 100) / max}%`,
                      minHeight: v > 0 ? 3 : 0,
                      background: i + 1 === peakDay ? EXPENSE_COLOR : MUTED_BAR,
                    }}
                  />
                </span>
              ))}
            </div>
            <div
              className="grid text-[10px] text-muted-foreground"
              style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
            >
              {totals.map((_, i) => (
                <span key={i} className="text-center">
                  {ticks.includes(i + 1) ? i + 1 : ""}
                </span>
              ))}
            </div>
            <figcaption className="sr-only">
              {totals
                .map((v, i) => t.stats.dayBar(formatDayMonth(dateOf(i + 1)), formatVND(v)))
                .join(", ")}
            </figcaption>
          </figure>
          <div className="flex flex-col gap-2 border-t border-surface-2 pt-4">
            <StackedBar
              label={t.stats.fixedVsFlexible}
              segments={[
                { key: "fixed", value: fixed, color: INCOME_COLOR },
                { key: "flex", value: flexible, color: EXPENSE_COLOR },
              ]}
            />
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: INCOME_COLOR }}
                />
                {t.stats.fixed} · {pct(fixed, monthTotal)}%
                <span className="font-display font-bold text-text">{formatNumber(fixed)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: EXPENSE_COLOR }}
                />
                {t.stats.flexible} · {pct(flexible, monthTotal)}%
                <span className="font-display font-bold text-text">{formatNumber(flexible)}</span>
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

/** Cột kép thu và chi 6 tháng kết thúc tại tháng đang xem; bấm để chuyển tháng. */
function FlowChart({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const q = useMonthlyTotals(month, FLOW_MONTHS);
  const rows = q.data ?? [];
  const max = Math.max(1, ...rows.flatMap((r) => [r.expense, r.income]));
  const net = rows.reduce((s, r) => s + r.income - r.expense, 0);

  return (
    <Card>
      <CardTitle
        aside={
          <span className="flex items-center gap-3.5">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px]"
                style={{ background: INCOME_COLOR }}
              />
              {t.stats.legendIncome}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px]"
                style={{ background: EXPENSE_COLOR }}
              />
              {t.stats.legendExpense}
            </span>
          </span>
        }
      >
        {t.stats.flow}
      </CardTitle>
      {q.isLoading ? (
        <div className="h-[150px] animate-pulse rounded-2xl bg-surface-2/50" />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} className="py-4" />
      ) : (
        <figure className="m-0 flex flex-col gap-2" aria-label={t.stats.flowLabel}>
          <div className="grid grid-cols-6 items-end gap-3">
            {rows.map((r) => {
              const active = r.month_start === month;
              const label = t.stats.flowBar(
                formatMonth(r.month_start),
                formatVND(r.expense),
                formatVND(r.income),
              );
              return (
                <button
                  key={r.month_start}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => setMonth(r.month_start)}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-0 bg-transparent p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    !active && "opacity-60 hover:opacity-90",
                  )}
                >
                  <span className="flex h-[130px] w-full items-end justify-center gap-[2px]">
                    <span
                      className="w-full max-w-5 rounded-t-[4px]"
                      style={{
                        height: `${(r.income * 100) / max}%`,
                        minHeight: r.income > 0 ? 3 : 0,
                        background: INCOME_COLOR,
                      }}
                    />
                    <span
                      className="w-full max-w-5 rounded-t-[4px]"
                      style={{
                        height: `${(r.expense * 100) / max}%`,
                        minHeight: r.expense > 0 ? 3 : 0,
                        background: EXPENSE_COLOR,
                      }}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] leading-4",
                      active ? "font-semibold text-text" : "text-muted-foreground",
                    )}
                  >
                    {formatMonthTick(r.month_start)}
                  </span>
                </button>
              );
            })}
          </div>
          <figcaption className="flex justify-between gap-3 text-[12px] text-muted-foreground">
            <span>{t.expenses.chartPick}</span>
            <span>
              {t.stats.net6}{" "}
              <span className={cn("font-display font-bold", net < 0 ? "text-danger" : "text-text")}>
                {net < 0 ? "−" : "+"}
                {formatNumber(Math.abs(net))}
              </span>
            </span>
          </figcaption>
        </figure>
      )}
    </Card>
  );
}

function CategoryCard({ summary, prev }: { summary: MonthSummary; prev?: MonthSummary }) {
  const list = summary.by_category;
  const max = Math.max(1, ...list.map((c) => c.amount));
  const prevById = new Map((prev?.by_category ?? []).map((c) => [c.category_id, c.amount]));
  return (
    <Card>
      <CardTitle aside={t.stats.categoryCount(list.length)}>{t.expenses.byCategory}</CardTitle>
      {list.length === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">{t.expenses.noSpending}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {list.map((c) => {
            const before = prevById.get(c.category_id) ?? 0;
            return (
              <li key={c.category_id} className="flex items-center gap-3">
                <IconTile icon={c.icon} color={c.color} size={34} />
                <div className="flex min-w-0 grow flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate font-medium">
                      {c.name}
                      <span className="ml-1.5 text-[11px] text-dim">{t.stats.count(c.count)}</span>
                    </span>
                    <span className="shrink-0 font-display font-bold">
                      {formatNumber(c.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-surface-2">
                    <div
                      className="h-full rounded"
                      style={{ width: `${(c.amount * 100) / max}%`, background: tone(c.color).fg }}
                    />
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]">
                    <span className="text-dim">
                      {t.stats.share(pct(c.amount, summary.total_expense))}
                    </span>
                    {before > 0 ? (
                      <Delta now={c.amount} prev={before} upIsGood={false} />
                    ) : (
                      <span className="text-dim">{t.stats.newCategory}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function FundCard({ summary }: { summary: MonthSummary }) {
  const { fundById } = useLookups();
  const list = [...summary.by_fund].sort((a, b) => b.spent - a.spent);
  const max = Math.max(1, ...list.map((f) => f.spent));
  return (
    <Card>
      <CardTitle>{t.stats.funds}</CardTitle>
      {list.length === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">{t.expenses.noSpending}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {list.map((f) => {
            const fund = fundById.get(f.fund_id);
            return (
              <li key={f.fund_id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate font-medium">{fund?.name ?? t.stats.unknownFund}</span>
                  <span className="shrink-0 font-display font-bold">{formatNumber(f.spent)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-surface-2">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(f.spent * 100) / max}%`,
                      background: tone(fund?.color).fg,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function TopCard({ txs }: { txs: Transaction[] }) {
  const { catById } = useLookups();
  const top = [...txs].sort((a, b) => b.amount - a.amount).slice(0, 5);
  return (
    <Card>
      <CardTitle>{t.stats.top}</CardTitle>
      {top.length === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">{t.expenses.noSpending}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {top.map((x, i) => {
            const cat = x.category_id ? catById.get(x.category_id) : undefined;
            return (
              <li
                key={x.id}
                className={cn(
                  "flex items-center gap-3 py-2.5",
                  i > 0 && "border-t border-surface-2",
                )}
              >
                <IconTile icon={cat?.icon ?? "circle"} color={cat?.color ?? "slate"} size={34} />
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-[13px] font-medium">
                    {x.note || cat?.name || t.expenses.untitled.expense}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(x.occurred_at)}
                    {cat && ` · ${cat.name}`}
                  </span>
                </span>
                <span className="shrink-0 font-display text-[13px] font-bold">
                  {formatNumber(x.amount)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export function StatsView() {
  const { month, isCurrent, range, setMonth } = useMonth();
  const today = localDate(new Date(), APP_TZ);
  const summary = useMonthSummary(month);
  const prev = useMonthSummary(addMonths(month, -1));
  const txs = useTransactions({ ...range, types: ["expense"], limit: 1000 });

  if (summary.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <CardSkeleton className="min-h-[150px]" />
        <CardSkeleton className="min-h-[150px]" />
      </div>
    );
  }
  if (summary.isError || !summary.data) {
    return (
      <div className="card">
        <ErrorState onRetry={() => summary.refetch()} />
      </div>
    );
  }

  const s = summary.data;
  const empty = s.total_expense === 0 && s.total_income === 0;

  return (
    <div className="flex flex-col gap-5">
      {empty && (
        <EmptyState
          icon={BarChart3}
          title={t.stats.emptyTitle(formatMonth(month))}
          body={t.stats.emptyBody}
          className="card py-8"
        />
      )}
      <Tiles summary={s} prev={prev.data} month={month} isCurrent={isCurrent} today={today} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DailyChart
          txs={txs.data ?? []}
          month={month}
          isLoading={txs.isLoading}
          isError={txs.isError}
          onRetry={() => txs.refetch()}
        />
        <FlowChart month={month} setMonth={setMonth} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        <CategoryCard summary={s} prev={prev.data} />
        <div className="flex flex-col gap-5">
          <FundCard summary={s} />
          <TopCard txs={txs.data ?? []} />
        </div>
      </div>
    </div>
  );
}
