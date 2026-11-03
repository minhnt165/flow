"use client";

import { Plus, Target } from "lucide-react";
import { CardSkeleton, EmptyState, ErrorState, RowsSkeleton } from "@/components/common/states";
import { ProgressRing } from "@/components/common/progress-ring";
import { PageHeader } from "@/components/layout/page";
import { ObjectiveRow } from "@/components/objectives/objective-row";
import { Button } from "@/components/ui/button";
import { useObjectives } from "@/hooks/use-objectives";
import { objectivePlan } from "@/lib/objectives";
import type { ObjectiveView } from "@/lib/supabase/types";
import { t } from "@/messages/vi";
import { useUi } from "@/stores/ui";

/** Tổng buổi tuần này của các mục tiêu đang thực hiện có đặt nhịp. */
function WeekCard({ active }: { active: ObjectiveView[] }) {
  const paced = active.filter((o) => o.sessions_per_week);
  const done = paced.reduce((s, o) => s + Math.min(o.week_count, o.sessions_per_week!), 0);
  const target = paced.reduce((s, o) => s + o.sessions_per_week!, 0);
  const pct = target ? Math.round((done * 100) / target) : 0;
  const behind = active.filter((o) => {
    const status = objectivePlan(o).status;
    return status === "behind" || status === "overdue";
  }).length;
  return (
    <div className="flex items-center gap-[18px] card-highlight rounded-[28px] p-6 md:rounded-3xl">
      <div className="flex min-w-0 grow flex-col gap-1.5">
        <span className="text-[11px] font-semibold tracking-[1.2px] uppercase opacity-75">
          {t.objectives.detail.thisWeek}
        </span>
        <span className="font-display text-[34px] leading-none font-bold tracking-[-1px]">
          {target ? `${done}/${target}` : active.length}
        </span>
        <span className="text-[12px] opacity-75">
          {[
            t.objectives.activeCount(active.length),
            behind > 0 ? `${behind} ${t.objectives.status.behind.toLowerCase()}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      {target > 0 && (
        <ProgressRing value={pct} size={88} stroke={8} color="var(--bg)">
          <span className="font-display text-xl font-bold">{pct}%</span>
        </ProgressRing>
      )}
    </div>
  );
}

export function ObjectivesView() {
  const q = useObjectives();
  const openObjective = useUi((s) => s.openObjective);
  const all = q.data ?? [];
  const done = all.filter((o) => o.completed_at);
  const upcoming = all.filter((o) => !o.completed_at && o.start_on > o.today);
  const active = all.filter((o) => !o.completed_at && o.start_on <= o.today);
  const sections = [
    { key: "active", title: t.objectives.sections.active, list: active },
    { key: "upcoming", title: t.objectives.sections.upcoming, list: upcoming },
    { key: "done", title: t.objectives.sections.done, list: done },
  ].filter((s) => s.list.length > 0);

  return (
    <>
      <PageHeader
        title={t.objectives.title}
        subtitle={active.length > 0 && <span>{t.objectives.activeCount(active.length)}</span>}
        actions={
          <>
            <Button
              className="hidden pr-[18px] pl-3.5 md:inline-flex"
              onClick={() => openObjective(null)}
            >
              <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
              {t.objectives.add}
            </Button>
            <button
              type="button"
              aria-label={t.objectives.add}
              onClick={() => openObjective(null)}
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
            icon={Target}
            title={t.objectives.empty}
            body={t.objectives.emptyBody}
            action={
              <Button onClick={() => openObjective(null)}>
                <Plus className="size-4" aria-hidden />
                {t.objectives.add}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {active.length > 0 && <WeekCard active={active} />}
          <div className="relative flex flex-col gap-5 md:gap-6 md:card md:px-6 md:py-5">
            {sections.map((s) => (
              <section key={s.key} className="flex flex-col">
                <h2 className="m-0 pb-1.5 label-caps">{s.title}</h2>
                {s.list.map((o) => (
                  <ObjectiveRow key={o.id} objective={o} />
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
