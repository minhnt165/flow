"use client";

import {
  Activity,
  CalendarHeart,
  ChevronRight,
  PiggyBank,
  Plus,
  SquareCheckBig,
} from "lucide-react";
import Link from "next/link";
import { IconTile } from "@/components/common/icon-tile";
import { ProgressBar } from "@/components/common/progress-bar";
import { ProgressRing } from "@/components/common/progress-ring";
import { CardSkeleton, EmptyState } from "@/components/common/states";
import { BudgetHighlight } from "@/components/expenses/overview";
import { TransactionList } from "@/components/expenses/transaction-list";
import { HabitRow } from "@/components/habits/habit-row";
import { PageHeader } from "@/components/layout/page";
import { TodoRow } from "@/components/todos/todo-row";
import { sortOpen } from "@/components/todos/todos-view";
import { Button } from "@/components/ui/button";
import { useCountdowns } from "@/hooks/use-countdowns";
import { useFunds, useGoals } from "@/hooks/use-funds";
import { useHabits } from "@/hooks/use-habits";
import { useProfile } from "@/hooks/use-profile";
import { useTodos } from "@/hooks/use-todos";
import { useTransactions } from "@/hooks/use-transactions";
import { tone } from "@/lib/colors";
import { APP_TZ, formatLongDate, localDate } from "@/lib/dates";
import { formatMillions, formatNumber, formatVND } from "@/lib/money";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

function NextCountdown() {
  const q = useCountdowns();
  const openCountdown = useUi((s) => s.openCountdown);
  if (q.isLoading) return <CardSkeleton />;
  const next = (q.data ?? [])
    .filter((c) => !c.is_past)
    .sort((a, b) => a.days_left - b.days_left)[0];
  if (!next) {
    return (
      <div className="card">
        <EmptyState
          icon={CalendarHeart}
          title={t.home.noEvent}
          className="py-6"
          action={
            <Button variant="secondary" size="sm" onClick={() => openCountdown(null)}>
              <Plus className="size-4" aria-hidden />
              {t.home.addEvent}
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <Link
      href="/countdowns"
      className="flex items-center gap-[18px] card p-6 text-text no-underline hover:border-border-strong hover:text-text"
    >
      <div className="flex min-w-0 grow flex-col gap-2">
        <span className="text-[11px] font-semibold tracking-[1.2px] text-accent uppercase">
          {t.home.nextEvent}
        </span>
        <span className="line-clamp-2 font-display text-[22px] leading-tight font-bold tracking-[-0.3px]">
          {next.title}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {formatLongDate(next.next_occurrence)}
        </span>
      </div>
      <ProgressRing value={next.elapsed_pct} size={104} stroke={9} color={tone(next.color).fg}>
        <span className="font-display text-[34px] font-bold tracking-[-1.5px]">
          {next.days_left}
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">{t.countdowns.daysLeft}</span>
      </ProgressRing>
    </Link>
  );
}

/** Tổng số dư mọi quỹ đang dùng + vài quỹ nhiều tiền nhất. */
function FundsTotalCard() {
  const q = useFunds();
  if (q.isLoading) return <CardSkeleton />;
  const list = q.data ?? [];
  const total = list.reduce((s, f) => s + f.balance, 0);
  const top = [...list].sort((a, b) => b.balance - a.balance).slice(0, 4);
  return (
    <div className="flex flex-col gap-3 card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 truncate text-[15px] font-semibold">
          {t.funds.totalBalance(list.length)}
        </h2>
        <Link href="/expenses/funds" className="shrink-0 text-[13px] font-medium no-underline">
          {t.home.seeAll}
        </Link>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="num-xl text-[34px]">{formatNumber(total)}</span>
        <span className="font-display text-lg font-bold">₫</span>
      </div>
      {top.map((f) => (
        <Link
          key={f.id}
          href={`/expenses/funds/${f.id}`}
          className="flex items-center gap-3 py-0.5 text-text no-underline hover:text-text"
        >
          <IconTile icon={f.icon} color={f.color} size={32} />
          <span className="min-w-0 grow truncate text-sm font-medium">{f.name}</span>
          <span className="shrink-0 text-sm text-muted-foreground">{formatVND(f.balance)}</span>
        </Link>
      ))}
    </div>
  );
}

function GoalsCard() {
  const q = useGoals();
  const openFund = useUi((s) => s.openFund);
  if (q.isLoading) return <CardSkeleton />;
  const goals = (q.data ?? []).slice(0, 3);
  return (
    <div className="flex flex-col gap-3 card p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-semibold">{t.home.goals}</h2>
        <Link href="/expenses/funds" className="text-[13px] font-medium no-underline">
          {t.home.seeAll}
        </Link>
      </div>
      {goals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={t.home.noGoals}
          className="py-4"
          action={
            <Button variant="secondary" size="sm" onClick={() => openFund(null)}>
              {t.home.createGoal}
            </Button>
          }
        />
      ) : (
        goals.map((g) => (
          <Link
            key={g.fund_id}
            href={`/expenses/funds/${g.fund_id}`}
            className="flex items-center gap-3 rounded-2xl py-1.5 text-text no-underline hover:text-text"
          >
            <IconTile icon={g.icon} color={g.color} size={36} />
            <span className="flex min-w-0 grow flex-col gap-1.5">
              <span className="flex justify-between gap-2 text-sm">
                <span className="truncate font-medium">{g.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{Math.round(g.pct)}%</span>
              </span>
              <ProgressBar
                value={g.pct}
                color={tone(g.color).fg}
                marker={g.behind_schedule ? g.expected_pct : null}
              />
              {g.per_period ? (
                <span className="text-[11px] text-muted-foreground">
                  {t.home.goalNeed(formatMillions(g.per_period))}
                </span>
              ) : null}
            </span>
            <ChevronRight className="size-4 shrink-0 text-dim" aria-hidden />
          </Link>
        ))
      )}
    </div>
  );
}

/** Việc quá hạn + hạn hôm nay, tối đa 4 dòng; tick ngay tại trang chủ. */
function TodayTodos() {
  const q = useTodos();
  const openTodo = useUi((s) => s.openTodo);
  if (q.isLoading) return <CardSkeleton />;
  const due = (q.data ?? [])
    .filter((x) => !x.done && x.days_left !== null && x.days_left <= 0)
    .sort(sortOpen);
  const shown = due.slice(0, 4);
  return (
    <div className="flex flex-col gap-2 card px-6 pt-6 pb-4">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-semibold">{t.home.todos}</h2>
        <Link href="/todos" className="text-[13px] font-medium no-underline">
          {t.home.seeAll}
        </Link>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={SquareCheckBig}
          title={t.home.noTodos}
          className="py-4"
          action={
            <Button variant="secondary" size="sm" onClick={() => openTodo(null)}>
              <Plus className="size-4" aria-hidden />
              {t.home.addTodo}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col">
          {shown.map((todo) => (
            <TodoRow key={todo.id} todo={todo} compact />
          ))}
          {due.length > shown.length && (
            <Link href="/todos" className="pt-2 text-[12px] font-medium no-underline">
              {t.home.moreTodos(due.length - shown.length)}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Thói quen đang theo dõi, tick hôm nay ngay tại trang chủ. */
function HabitsCard() {
  const q = useHabits();
  const openHabit = useUi((s) => s.openHabit);
  if (q.isLoading) return <CardSkeleton />;
  const active = (q.data ?? []).filter((h) => !h.archived_at);
  const done = active.filter((h) => h.done_today).length;
  return (
    <div className="flex flex-col gap-2 card px-6 pt-6 pb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 flex min-w-0 items-baseline gap-2 text-[15px] font-semibold">
          <span className="truncate">{t.home.habits}</span>
          {active.length > 0 && (
            <span className="shrink-0 text-[12px] font-medium text-muted-foreground">
              {t.habits.todayCount(done, active.length)}
            </span>
          )}
        </h2>
        <Link href="/habits" className="shrink-0 text-[13px] font-medium no-underline">
          {t.home.seeAll}
        </Link>
      </div>
      {active.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={t.home.noHabits}
          className="py-4"
          action={
            <Button variant="secondary" size="sm" onClick={() => openHabit(null)}>
              <Plus className="size-4" aria-hidden />
              {t.home.addHabit}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col">
          {active.slice(0, 5).map((h) => (
            <HabitRow key={h.id} habit={h} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentCard() {
  const q = useTransactions({ limit: 5 });
  return (
    <div className="relative flex flex-col md:card md:px-6 md:pt-2 md:pb-3">
      <div className="flex items-center justify-between pb-3 md:py-4">
        <h2 className="m-0 text-[15px] font-semibold">{t.home.recent}</h2>
        <Link href="/expenses/transactions" className="text-[13px] font-medium no-underline">
          {t.home.seeAll}
        </Link>
      </div>
      <TransactionList
        transactions={q.data}
        isLoading={q.isLoading}
        isError={q.isError}
        onRetry={() => q.refetch()}
      />
    </div>
  );
}

export function HomeView() {
  const profile = useProfile();
  const openTx = useUi((s) => s.openTx);
  const name = profile.data?.display_name ?? "";
  return (
    <>
      <PageHeader
        title={name ? t.home.greeting(name) : t.nav.home}
        subtitle={formatLongDate(localDate(new Date(), APP_TZ))}
        actions={
          <Button className="pr-[18px] pl-3.5" onClick={() => openTx("expense")}>
            <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
            {t.expenses.add}
          </Button>
        }
      />
      <div className="relative grid grid-cols-1 gap-5 md:grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <BudgetHighlight />
        <FundsTotalCard />
        <NextCountdown />
        <TodayTodos />
        <HabitsCard />
        <GoalsCard />
      </div>
      <RecentCard />
    </>
  );
}
