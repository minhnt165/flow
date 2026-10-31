"use client";

import { Receipt, Search } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/common/states";
import { useLookups } from "@/hooks/use-lookups";
import { addDays, APP_TZ, formatDateTime, formatDayMonth, localDate, localTime } from "@/lib/dates";
import { formatNumber, formatSigned } from "@/lib/money";
import type { Category, FundWithBalance, Transaction } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

type Lookups = ReturnType<typeof useLookups>;

function describe(tx: Transaction, l: Lookups) {
  const cat: Category | undefined = tx.category_id ? l.catById.get(tx.category_id) : undefined;
  const fund: FundWithBalance | undefined = l.fundById.get(tx.fund_id);
  const toFund = tx.to_fund_id ? l.fundById.get(tx.to_fund_id) : undefined;
  const isTransfer = tx.type === "transfer";
  return {
    title:
      tx.note ||
      (isTransfer ? t.expenses.transferLabel : cat?.name) ||
      t.expenses.untitled[tx.type],
    icon: isTransfer ? "arrow-left-right" : (cat?.icon ?? "circle-ellipsis"),
    color: isTransfer ? "slate" : (cat?.color ?? "slate"),
    category: isTransfer ? t.expenses.transferLabel : (cat?.name ?? "—"),
    fund: isTransfer ? t.funds.arrow(fund?.name ?? "—", toFund?.name ?? "—") : (fund?.name ?? "—"),
    amount:
      tx.type === "expense"
        ? formatSigned(tx.amount, "-")
        : tx.type === "income"
          ? formatSigned(tx.amount, "+")
          : formatNumber(tx.amount),
    source:
      tx.source === "telegram"
        ? t.expenses.sourceTelegram
        : tx.source === "auto"
          ? t.expenses.sourceAuto
          : null,
  };
}

function dayLabel(day: string, today: string) {
  if (day === today) return `${t.common.today} · ${formatDayMonth(day)}`;
  if (day === addDays(today, -1)) return `${t.common.yesterday} · ${formatDayMonth(day)}`;
  return formatDayMonth(day);
}

export function SearchBox({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[38px] min-w-0 items-center gap-2.5 rounded-full border border-border bg-bg px-3.5 focus-within:border-accent/60 sm:min-w-[220px]",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <label htmlFor="tx-search" className="sr-only">
        {t.expenses.searchLabel}
      </label>
      <input
        id="tx-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.expenses.searchPlaceholder}
        className="min-w-0 grow border-0 bg-transparent text-base text-text outline-none placeholder:text-dim md:text-[13px]"
      />
    </div>
  );
}

export function TransactionList({
  transactions,
  isLoading,
  isError,
  onRetry,
  searching,
}: {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  searching?: boolean;
}) {
  const l = useLookups();
  const editTx = useUi((s) => s.editTx);

  if (isError) return <ErrorState onRetry={onRetry} />;
  if (isLoading || l.isLoading) return <RowsSkeleton />;
  if (!transactions?.length) {
    return searching ? (
      <EmptyState icon={Search} title={t.expenses.noResults} />
    ) : (
      <EmptyState
        icon={Receipt}
        title={t.expenses.noTransactions}
        body={t.expenses.noTransactionsBody}
      />
    );
  }

  const open = (tx: Transaction) => {
    if (!tx.id.startsWith("optimistic-")) editTx(tx);
  };
  const today = localDate(new Date(), APP_TZ);
  const groups: { day: string; items: Transaction[] }[] = [];
  for (const tx of transactions) {
    const day = localDate(new Date(tx.occurred_at), APP_TZ);
    if (groups.at(-1)?.day === day) groups.at(-1)!.items.push(tx);
    else groups.push({ day, items: [tx] });
  }

  return (
    <>
      {/* Điện thoại: danh sách nhóm theo ngày */}
      <div className="flex flex-col gap-4 md:hidden">
        {groups.map((g) => (
          <section key={g.day} className="flex flex-col">
            <h3 className="m-0 pb-2 label-caps">{dayLabel(g.day, today)}</h3>
            {g.items.map((tx) => {
              const d = describe(tx, l);
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => open(tx)}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3.5 border-0 border-b border-solid border-surface-2 bg-transparent py-3 text-left text-text last:border-b-0"
                >
                  <IconTile icon={d.icon} color={d.color} size={42} />
                  <span className="flex min-w-0 grow flex-col gap-[3px]">
                    <span className="truncate text-[15px] font-medium">{d.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[localTime(new Date(tx.occurred_at), APP_TZ), d.category, d.fund, d.source]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-display text-base font-bold whitespace-nowrap",
                      tx.type === "income" && "text-cat-green",
                    )}
                  >
                    {d.amount}
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      {/* Desktop: bảng, cuộn ngang khi hẹp */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold tracking-[1px] text-muted-foreground uppercase">
              <th className="border-b border-surface-2 py-2.5 font-semibold">
                {t.expenses.columns.transaction}
              </th>
              <th className="border-b border-surface-2 py-2.5 font-semibold">
                {t.expenses.columns.category}
              </th>
              <th className="border-b border-surface-2 py-2.5 font-semibold">
                {t.expenses.columns.fund}
              </th>
              <th className="border-b border-surface-2 py-2.5 font-semibold">
                {t.expenses.columns.time}
              </th>
              <th className="border-b border-surface-2 py-2.5 text-right font-semibold">
                {t.expenses.columns.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const d = describe(tx, l);
              return (
                <tr
                  key={tx.id}
                  tabIndex={0}
                  onClick={() => open(tx)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(tx))
                  }
                  className="cursor-pointer outline-none hover:bg-surface-2/40 focus-visible:bg-surface-2/60 [&:last-child>td]:border-b-0"
                >
                  <td className="border-b border-surface-2 py-3.5 pr-3">
                    <div className="flex items-center gap-3">
                      <IconTile icon={d.icon} color={d.color} size={36} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{d.title}</span>
                        {d.source && <span className="text-[11px] text-dim">{d.source}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-surface-2 py-3.5 pr-3 text-muted-foreground">
                    {d.category}
                  </td>
                  <td className="border-b border-surface-2 py-3.5 pr-3 text-muted-foreground">
                    {d.fund}
                  </td>
                  <td className="border-b border-surface-2 py-3.5 pr-3 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(tx.occurred_at)}
                  </td>
                  <td
                    className={cn(
                      "border-b border-surface-2 py-3.5 text-right font-display font-bold whitespace-nowrap",
                      tx.type === "income" && "text-cat-green",
                    )}
                  >
                    {d.amount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
