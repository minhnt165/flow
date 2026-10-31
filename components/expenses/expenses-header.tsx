"use client";

import { ArrowLeftRight, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MonthPicker } from "@/components/expenses/month-picker";
import { PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { APP_TZ, formatLongDate, localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

const TABS = [
  { href: "/expenses", label: t.expenses.tabs.overview },
  { href: "/expenses/funds", label: t.expenses.tabs.funds },
  { href: "/expenses/transactions", label: t.expenses.tabs.transactions },
];

export function ExpensesHeader() {
  const pathname = usePathname();
  const params = useSearchParams();
  const openTx = useUi((s) => s.openTx);
  const onFunds = pathname.startsWith("/expenses/funds");
  const qs = params.get("month") ? `?month=${params.get("month")}` : "";

  // Trang chi tiết quỹ có breadcrumb riêng.
  if (/^\/expenses\/funds\/[^/]+$/.test(pathname)) return null;

  return (
    <div className="relative flex flex-col gap-4">
      <PageHeader
        title={t.expenses.title}
        subtitle={
          <span className="hidden md:inline">{formatLongDate(localDate(new Date(), APP_TZ))}</span>
        }
        actions={
          <>
            <MonthPicker />
            {onFunds && (
              <>
                <Button
                  variant="secondary"
                  className="hidden md:inline-flex"
                  onClick={() => openTx("transfer")}
                >
                  <ArrowLeftRight aria-hidden />
                  {t.expenses.addTransfer}
                </Button>
                <Button
                  variant="secondary"
                  className="hidden md:inline-flex"
                  onClick={() => openTx("income")}
                >
                  <TrendingUp aria-hidden />
                  {t.expenses.addIncome}
                </Button>
              </>
            )}
            <Button
              className="hidden pr-[18px] pl-3.5 md:inline-flex"
              onClick={() => openTx("expense")}
            >
              <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
              {t.expenses.add}
            </Button>
          </>
        }
      />
      <nav
        aria-label={t.expenses.tabsLabel}
        className="flex gap-1.5 overflow-x-auto border-b border-surface-2"
      >
        {TABS.map((tab) => {
          const active =
            tab.href === "/expenses" ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={`${tab.href}${qs}`}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3.5 text-sm no-underline",
                active
                  ? "border-accent font-semibold text-text hover:text-text"
                  : "border-transparent font-medium text-muted-foreground hover:text-text",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Nút tròn nổi "Thêm giao dịch" trên điện thoại. */
export function AddFab() {
  const openTx = useUi((s) => s.openTx);
  return (
    <button
      type="button"
      aria-label={t.expenses.add}
      onClick={() => openTx("expense")}
      className="fixed right-[22px] bottom-[100px] z-30 flex size-[58px] cursor-pointer items-center justify-center rounded-full border-0 bg-accent text-bg shadow-[0_12px_30px_rgb(212_240_74/0.35)] md:hidden"
    >
      <Plus className="size-6" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
