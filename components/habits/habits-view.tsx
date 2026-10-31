"use client";

import { Activity, Plus } from "lucide-react";
import { toast } from "sonner";
import { CardSkeleton, EmptyState, ErrorState, RowsSkeleton } from "@/components/common/states";
import { ProgressRing } from "@/components/common/progress-ring";
import { HabitRow } from "@/components/habits/habit-row";
import { PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { useArchiveHabit, useHabits } from "@/hooks/use-habits";
import type { HabitView } from "@/lib/supabase/types";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

function TodayCard({ habits }: { habits: HabitView[] }) {
  const done = habits.filter((h) => h.done_today).length;
  const pct = habits.length ? Math.round((done * 100) / habits.length) : 0;
  const best = [...habits].sort((a, b) => b.streak - a.streak)[0];
  return (
    <div className="flex items-center gap-[18px] card-highlight rounded-[28px] p-6 md:rounded-3xl">
      <div className="flex min-w-0 grow flex-col gap-1.5">
        <span className="text-[11px] font-semibold tracking-[1.2px] uppercase opacity-75">
          {t.home.habits}
        </span>
        <span className="font-display text-[34px] leading-none font-bold tracking-[-1px]">
          {t.habits.todayCount(done, habits.length)}
        </span>
        {best && best.streak > 0 && (
          <span className="text-[12px] opacity-75">
            {best.name} · {t.habits.streak(best.streak)}
          </span>
        )}
      </div>
      <ProgressRing value={pct} size={88} stroke={8} color="var(--bg)">
        <span className="font-display text-xl font-bold">{pct}%</span>
      </ProgressRing>
    </div>
  );
}

export function HabitsView() {
  const q = useHabits();
  const openHabit = useUi((s) => s.openHabit);
  const archive = useArchiveHabit();
  const all = q.data ?? [];
  const active = all.filter((h) => !h.archived_at);
  const archived = all.filter((h) => h.archived_at);

  const resume = async (id: string) => {
    try {
      await archive.mutateAsync({ id, archived: false });
      toast.success(t.habits.resumed);
    } catch {
      toast.error(t.habits.dialog.errors.save);
    }
  };

  return (
    <>
      <PageHeader
        title={t.habits.title}
        subtitle={
          active.length > 0 && (
            <span>
              {t.habits.todayProgress(active.filter((h) => h.done_today).length, active.length)}
            </span>
          )
        }
        actions={
          <>
            <Button
              className="hidden pr-[18px] pl-3.5 md:inline-flex"
              onClick={() => openHabit(null)}
            >
              <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
              {t.habits.add}
            </Button>
            <button
              type="button"
              aria-label={t.habits.add}
              onClick={() => openHabit(null)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-accent text-bg shadow-[0_8px_24px_rgb(212_240_74/0.3)] md:hidden"
            >
              <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            </button>
          </>
        }
      />

      {q.isLoading ? (
        <>
          <CardSkeleton className="min-h-[140px] rounded-[28px]" />
          <RowsSkeleton />
        </>
      ) : q.isError ? (
        <div className="card">
          <ErrorState onRetry={() => q.refetch()} />
        </div>
      ) : all.length === 0 ? (
        <div className="relative card">
          <EmptyState
            icon={Activity}
            title={t.habits.empty}
            body={t.habits.emptyBody}
            action={
              <Button onClick={() => openHabit(null)}>
                <Plus className="size-4" aria-hidden />
                {t.habits.add}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {active.length > 0 && <TodayCard habits={active} />}
          <div className="relative flex flex-col gap-5 md:gap-6 md:card md:px-6 md:py-5">
            {active.length > 0 && (
              <section className="flex flex-col">
                <h2 className="m-0 pb-1.5 label-caps">{t.habits.sections.active}</h2>
                {active.map((h) => (
                  <HabitRow key={h.id} habit={h} />
                ))}
              </section>
            )}
            {archived.length > 0 && (
              <section className="flex flex-col">
                <h2 className="m-0 pb-1.5 label-caps">{t.habits.sections.archived}</h2>
                {archived.map((h) => (
                  <div key={h.id} className="flex items-center gap-3">
                    <div className="min-w-0 grow">
                      <HabitRow habit={h} />
                    </div>
                    <Button
                      variant="field"
                      size="sm"
                      className="min-h-10 shrink-0"
                      disabled={archive.isPending}
                      onClick={() => resume(h.id)}
                    >
                      {t.habits.resume}
                    </Button>
                  </div>
                ))}
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
