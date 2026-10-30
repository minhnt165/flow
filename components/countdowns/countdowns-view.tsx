"use client";

import { CalendarHeart, Link2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { IconTile } from "@/components/common/icon-tile";
import { ProgressRing } from "@/components/common/progress-ring";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/states";
import { CountdownCard } from "@/components/countdowns/countdown-card";
import { PageHeader } from "@/components/layout/page";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCountdowns, useLinkCountdownFund } from "@/hooks/use-countdowns";
import { useFunds } from "@/hooks/use-funds";
import { formatDate, formatDayMonth, formatLongDate } from "@/lib/dates";
import { formatNumber } from "@/lib/money";
import type { CountdownView } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

type Filter = "upcoming" | "yearly" | "past";

function LinkBudget({ c }: { c: CountdownView }) {
  const funds = useFunds();
  const link = useLinkCountdownFund();
  const openFund = useUi((s) => s.openFund);
  const linked = funds.data?.find((f) => f.id === c.fund_id);
  const goals = (funds.data ?? []).filter((f) => f.kind === "goal");

  if (linked) {
    return (
      <Link
        href={linked.kind === "goal" ? `/expenses/funds/${linked.id}` : "/expenses/funds"}
        className={cn(buttonVariants({ variant: "field", size: "toolbar" }), "min-h-10")}
      >
        <Link2 className="size-4" aria-hidden />
        {t.countdowns.linkedFund(linked.name)}
      </Link>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "field", size: "toolbar" }), "min-h-10")}
      >
        {t.countdowns.linkBudget}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {goals.map((f) => (
          <DropdownMenuItem
            key={f.id}
            onClick={async () => {
              try {
                await link.mutateAsync({ id: c.id, fundId: f.id });
                toast.success(t.countdowns.linked);
              } catch {
                toast.error(t.countdowns.dialog.errors.save);
              }
            }}
          >
            <IconTile icon={f.icon} color={f.color} size={28} />
            <span className="truncate">{f.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() =>
            openFund(null, { name: c.title, icon: c.icon, color: c.color, countdownId: c.id })
          }
        >
          <Plus className="size-4" aria-hidden />
          {t.countdowns.newGoalFund}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Featured({ c }: { c: CountdownView }) {
  const openCountdown = useUi((s) => s.openCountdown);
  const tiles = [
    { value: Math.floor(c.days_left / 30), label: t.countdowns.months },
    { value: Math.floor(c.days_left / 7), label: t.countdowns.weeks },
    { value: c.days_left * 24, label: t.countdowns.hours },
  ];
  return (
    <div className="relative flex flex-col gap-4 card rounded-[28px] p-[22px] md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-8 md:px-9 md:py-8">
      <div className="flex items-center gap-[18px] md:contents">
        <div className="flex min-w-0 grow flex-col gap-2.5 md:flex-[1_1_320px] md:gap-3">
          <span className="text-[11px] font-semibold tracking-[1.2px] text-accent uppercase">
            {t.countdowns.nearest}
          </span>
          <span className="font-display text-[22px] leading-[1.15] font-bold tracking-[-0.3px] md:text-4xl md:leading-[1.1] md:tracking-[-1px]">
            {c.title}
          </span>
          <span className="text-[13px] text-muted-foreground md:text-[15px]">
            {formatLongDate(c.next_occurrence)}
            <span className="hidden md:inline">{c.repeat_yearly && t.countdowns.repeatSuffix}</span>
          </span>
          {c.repeat_yearly && (
            <span className="self-start rounded-[10px] bg-surface-2 px-2.5 py-[5px] text-[11px] font-semibold text-soft md:hidden">
              {t.countdowns.yearly}
            </span>
          )}
          <div className="mt-2 hidden flex-wrap gap-2.5 md:flex">
            <Button variant="field" className="min-h-10" onClick={() => openCountdown(c)}>
              {t.countdowns.edit}
            </Button>
            <LinkBudget c={c} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-7">
          <div className="hidden grid-cols-3 gap-2.5 lg:grid">
            {tiles.map((x) => (
              <div
                key={x.label}
                className="flex min-w-16 flex-col items-center gap-1 rounded-2xl border border-surface-2 bg-bg px-2 py-3.5"
              >
                <span className="font-display text-[28px] leading-none font-bold tracking-[-1px]">
                  {formatNumber(x.value)}
                </span>
                <span className="text-[11px] text-muted-foreground">{x.label}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openCountdown(c)}
            aria-label={`${t.countdowns.edit} ${c.title}`}
            className="cursor-pointer rounded-full border-0 bg-transparent p-0 text-text md:pointer-events-none"
          >
            <ProgressRing value={c.elapsed_pct} size={150} stroke={11} className="hidden md:block">
              <span className="font-display text-[52px] font-bold tracking-[-2.5px]">
                {c.days_left}
              </span>
              <span className="mt-1.5 text-xs text-muted-foreground">{t.countdowns.daysLeft}</span>
            </ProgressRing>
            <ProgressRing value={c.elapsed_pct} size={116} stroke={9} className="md:hidden">
              <span className="font-display text-[40px] font-bold tracking-[-1.5px]">
                {c.days_left}
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                {t.countdowns.daysLeft}
              </span>
            </ProgressRing>
          </button>
        </div>
      </div>
      <div className="flex w-full flex-wrap gap-2.5 md:hidden">
        <Button variant="field" className="min-h-10" onClick={() => openCountdown(c)}>
          {t.countdowns.edit}
        </Button>
        <LinkBudget c={c} />
      </div>
    </div>
  );
}

export function CountdownsView() {
  const q = useCountdowns();
  const openCountdown = useUi((s) => s.openCountdown);
  const [filter, setFilter] = useState<Filter>("upcoming");

  const all = q.data ?? [];
  const upcoming = all.filter((c) => !c.is_past).sort((a, b) => a.days_left - b.days_left);
  const list =
    filter === "upcoming"
      ? upcoming
      : filter === "yearly"
        ? all.filter((c) => c.repeat_yearly).sort((a, b) => a.days_left - b.days_left)
        : all.filter((c) => c.is_past).sort((a, b) => b.event_date.localeCompare(a.event_date));
  const featured = filter === "upcoming" ? list[0] : undefined;
  const rest = featured ? list.slice(1) : list;

  const filters: { value: Filter; label: string }[] = [
    { value: "upcoming", label: t.countdowns.filters.upcoming },
    { value: "yearly", label: t.countdowns.filters.yearly },
    { value: "past", label: t.countdowns.filters.past },
  ];

  return (
    <>
      <PageHeader
        title={t.countdowns.title}
        subtitle={
          <span className="hidden md:inline">{t.countdowns.upcomingCount(upcoming.length)}</span>
        }
        actions={
          <>
            <div
              role="radiogroup"
              aria-label={t.countdowns.filterLabel}
              className="hidden gap-1.5 md:flex"
            >
              {filters.map((f) => (
                <FilterPill
                  key={f.value}
                  active={filter === f.value}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </FilterPill>
              ))}
            </div>
            <Button
              className="hidden pr-[18px] pl-3.5 md:inline-flex"
              onClick={() => openCountdown(null)}
            >
              <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
              {t.countdowns.add}
            </Button>
            <button
              type="button"
              aria-label={t.countdowns.add}
              onClick={() => openCountdown(null)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-accent text-bg shadow-[0_8px_24px_rgb(212_240_74/0.3)] md:hidden"
            >
              <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            </button>
          </>
        }
      />
      <div
        role="radiogroup"
        aria-label={t.countdowns.filterLabel}
        className="relative -mt-2 flex gap-2 md:hidden"
      >
        {filters.map((f) => (
          <FilterPill key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </FilterPill>
        ))}
      </div>

      {q.isLoading ? (
        <CardSkeleton className="min-h-[214px] rounded-[28px]" />
      ) : q.isError ? (
        <div className="card">
          <ErrorState onRetry={() => q.refetch()} />
        </div>
      ) : all.length === 0 ? (
        <div className="relative card">
          <EmptyState
            icon={CalendarHeart}
            title={t.countdowns.empty}
            body={t.countdowns.emptyBody}
            action={
              <Button onClick={() => openCountdown(null)}>
                <Plus className="size-4" aria-hidden />
                {t.countdowns.add}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {featured && <Featured c={featured} />}
          {rest.length === 0 && !featured ? (
            <div className="relative card">
              <EmptyState icon={CalendarHeart} title={t.countdowns.emptyFiltered} />
            </div>
          ) : (
            <>
              {/* Điện thoại: danh sách */}
              <div className="relative flex flex-col md:hidden">
                {featured && rest.length > 0 && (
                  <span className="pb-2 label-caps">{t.countdowns.next}</span>
                )}
                {rest.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCountdown(c)}
                    className="flex cursor-pointer items-center gap-3.5 border-0 border-b border-solid border-surface-2 bg-transparent py-[13px] text-left text-text last:border-b-0"
                  >
                    <IconTile icon={c.icon} color={c.color} size={44} />
                    <span className="flex min-w-0 grow flex-col gap-[3px]">
                      <span className="truncate text-[15px] font-semibold">{c.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.repeat_yearly
                          ? `${formatDayMonth(c.next_occurrence)} · ${t.countdowns.yearly}`
                          : formatDate(c.next_occurrence)}
                      </span>
                    </span>
                    {c.is_past ? (
                      <span className="text-xs text-muted-foreground">
                        {t.countdowns.pastAgo(-c.days_left)}
                      </span>
                    ) : (
                      <span className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold tracking-[-0.5px]">
                          {c.days_left}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {t.countdowns.days}
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* Desktop: lưới thẻ */}
              <div className="relative hidden grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4 md:grid">
                {rest.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCountdown(c)}
                    className="cursor-pointer card rounded-[22px] p-[22px] text-left text-text transition-colors hover:border-border-strong"
                  >
                    <CountdownCard
                      className="h-full"
                      title={c.title}
                      date={c.next_occurrence}
                      daysLeft={c.days_left}
                      repeat={c.repeat_yearly}
                      icon={c.icon}
                      color={c.color}
                      isPast={c.is_past}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "min-h-9 cursor-pointer rounded-full px-4 text-[13px] md:min-h-[38px]",
        active
          ? "border-0 bg-text font-semibold text-bg"
          : "border border-border bg-surface font-medium text-soft hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
