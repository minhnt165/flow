"use client";

import { Check, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { IconTile } from "@/components/common/icon-tile";
import { CardSkeleton, EmptyState, ErrorState, RowsSkeleton } from "@/components/common/states";
import { PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { useBills, useToggleBill } from "@/hooks/use-bills";
import { useLookups } from "@/hooks/use-lookups";
import { formatDayMonth } from "@/lib/dates";
import { formatNumber, formatVND } from "@/lib/money";
import type { BillView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

type Section = "overdue" | "soon" | "later" | "paused";
const SECTIONS: Section[] = ["overdue", "soon", "later", "paused"];

function sectionOf(b: BillView): Section {
  if (!b.active) return "paused";
  if (b.days_left < 0) return "overdue";
  if (b.days_left <= 7) return "soon";
  return "later";
}

/** "Hạn 05/11 · còn 6 ngày" / "Hạn hôm nay" / "Hạn 31/08 · trễ 60 ngày" */
export function dueText(b: BillView) {
  const date = formatDayMonth(b.next_run_on);
  if (b.days_left === 0) return t.bills.dueToday;
  if (b.days_left < 0) return `${t.bills.due(date)} · ${t.bills.overdueBy(-b.days_left)}`;
  return `${t.bills.due(date)} · ${t.bills.dueIn(b.days_left)}`;
}

/** Hoá đơn đến hạn trong tháng hiện tại (đã trả, hoặc hạn tới rơi vào tháng này). */
function dueThisMonth(b: BillView) {
  return b.paid_this_month || b.next_run_on.slice(0, 7) === b.today.slice(0, 7);
}

function SummaryCard({ bills }: { bills: BillView[] }) {
  const active = bills.filter((b) => b.active);
  // Quy đổi về mỗi tháng: hoá đơn 3 tháng/lần tính 1/3.
  const total = active.reduce((s, b) => s + Math.round(b.amount / b.interval_months), 0);
  const mixed = active.some((b) => b.interval_months > 1);
  const due = active.filter(dueThisMonth);
  const paid = due.filter((b) => b.paid_this_month);
  const paidAmount = paid.reduce((s, b) => s + (b.last_paid_amount ?? b.amount), 0);
  const dueSoon = active
    .filter((b) => b.days_left <= 7 && !b.paid_this_month)
    .reduce((s, b) => s + b.amount, 0);
  const stats = [
    {
      label: t.bills.paidThisMonth,
      value: formatNumber(paidAmount),
      sub: t.bills.paidProgress(paid.length, due.length),
    },
    { label: t.bills.dueSoon, value: formatNumber(dueSoon) },
  ];
  return (
    <div className="flex flex-col gap-[18px] card-highlight rounded-[28px] p-6 md:rounded-3xl">
      <span className="text-[11px] font-semibold tracking-[1.2px] uppercase opacity-75">
        {t.bills.monthlyTotal}
      </span>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="num-xl text-[42px]">{formatNumber(total)}</span>
          <span className="font-display text-xl font-bold">₫</span>
        </div>
        {mixed && <span className="text-[12px] opacity-75">{t.bills.monthlyTotalHint}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-bg/15 pt-3.5">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold opacity-70">{s.label}</span>
            <span className="font-display text-[15px] font-bold tracking-[-0.3px] break-all">
              {s.value}
            </span>
            {s.sub && <span className="text-[11px] opacity-70">{s.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function BillRow({ bill: b }: { bill: BillView }) {
  const { catById, fundById } = useLookups();
  const openBill = useUi((s) => s.openBill);
  const openPayBill = useUi((s) => s.openPayBill);
  const toggle = useToggleBill();
  const cat = b.category_id ? catById.get(b.category_id) : undefined;
  const fund = fundById.get(b.fund_id);
  const overdue = b.active && b.days_left < 0;
  // Đã trả trong tháng và hạn tới còn xa thì chỉ hiện nhãn; gần hạn vẫn cho đánh dấu lần nữa.
  const showPay = b.active && (!b.paid_this_month || b.days_left <= 7);
  const interval = b.interval_months > 1 ? t.bills.intervalLabel(b.interval_months) : null;
  const sub = b.active
    ? [dueText(b), interval, fund?.name].filter(Boolean).join(" · ")
    : [interval ?? t.bills.everyMonth(b.day_of_month), fund?.name].filter(Boolean).join(" · ");

  const resume = async () => {
    try {
      await toggle.mutateAsync({ id: b.id, active: true });
      toast.success(t.bills.resumed);
    } catch {
      toast.error(t.bills.dialog.errors.save);
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-surface-2 py-2.5 last:border-b-0 md:gap-4">
      <button
        type="button"
        onClick={() => openBill(b)}
        className="flex min-h-11 min-w-0 grow cursor-pointer items-center gap-3.5 border-0 bg-transparent p-0 text-left text-text"
      >
        <IconTile icon={cat?.icon ?? "zap"} color={cat?.color ?? "green"} size={42} />
        <span className="flex min-w-0 grow flex-col gap-[3px]">
          <span className={cn("truncate text-[15px] font-medium", !b.active && "text-soft")}>
            {b.name}
          </span>
          <span
            className={cn(
              "line-clamp-2 text-xs leading-snug text-muted-foreground",
              overdue && "font-medium text-danger",
            )}
          >
            {sub}
          </span>
        </span>
        <span
          className={cn(
            "font-display text-base font-bold whitespace-nowrap",
            !b.active && "text-soft",
          )}
        >
          {formatNumber(b.amount)}
        </span>
      </button>
      {showPay ? (
        <Button
          variant="field"
          size="sm"
          className="min-h-10 shrink-0 max-md:size-10 max-md:px-0"
          aria-label={t.bills.markPaidFor(b.name)}
          onClick={() => openPayBill(b)}
        >
          <Check className="size-4" aria-hidden />
          <span className="max-md:hidden">{t.bills.markPaid}</span>
        </Button>
      ) : b.active ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cat-green-bg px-2.5 py-1.5 text-[11px] font-semibold text-cat-green">
          <Check className="size-3.5" aria-hidden />
          {t.bills.paidBadge}
        </span>
      ) : (
        <Button
          variant="field"
          size="sm"
          className="min-h-10 shrink-0"
          disabled={toggle.isPending}
          onClick={resume}
        >
          {t.bills.resume}
        </Button>
      )}
    </div>
  );
}

export function BillsView() {
  const q = useBills();
  const openBill = useUi((s) => s.openBill);
  const all = q.data ?? [];
  const active = all.filter((b) => b.active);
  const total = active.reduce((s, b) => s + b.amount, 0);
  const groups = SECTIONS.map((key) => ({
    key,
    items: all
      .filter((b) => sectionOf(b) === key)
      .sort((a, b) => a.days_left - b.days_left || a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        title={t.bills.title}
        subtitle={
          all.length > 0 && (
            <span className="hidden md:inline">
              {t.bills.count(active.length)} · {t.bills.perMonth(formatVND(total))}
            </span>
          )
        }
        actions={
          <>
            <Button
              className="hidden pr-[18px] pl-3.5 md:inline-flex"
              onClick={() => openBill(null)}
            >
              <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
              {t.bills.add}
            </Button>
            <button
              type="button"
              aria-label={t.bills.add}
              onClick={() => openBill(null)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-accent text-bg shadow-[0_8px_24px_rgb(212_240_74/0.3)] md:hidden"
            >
              <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            </button>
          </>
        }
      />

      {q.isLoading ? (
        <>
          <CardSkeleton className="min-h-[188px] rounded-[28px]" />
          <RowsSkeleton />
        </>
      ) : q.isError ? (
        <div className="card">
          <ErrorState onRetry={() => q.refetch()} />
        </div>
      ) : all.length === 0 ? (
        <div className="relative card">
          <EmptyState
            icon={Zap}
            title={t.bills.empty}
            body={t.bills.emptyBody}
            action={
              <Button onClick={() => openBill(null)}>
                <Plus className="size-4" aria-hidden />
                {t.bills.add}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <SummaryCard bills={all} />
          <div className="relative flex flex-col gap-5 md:gap-6 md:card md:px-6 md:py-5">
            {groups.map((g) => (
              <section key={g.key} className="flex flex-col">
                <h2 className={cn("m-0 pb-1.5 label-caps", g.key === "overdue" && "text-danger")}>
                  {t.bills.sections[g.key]}
                </h2>
                {g.items.map((b) => (
                  <BillRow key={b.id} bill={b} />
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
