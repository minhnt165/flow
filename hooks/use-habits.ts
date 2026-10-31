"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  createHabit,
  deleteHabit,
  listHabits,
  toggleHabit,
  updateHabit,
} from "@/lib/supabase/habits";
import type { HabitInput, HabitView } from "@/lib/supabase/types";

const sb = () => getBrowserClient();

export function useHabits() {
  return useQuery({ queryKey: qk.habits, queryFn: () => listHabits(sb()) });
}

function useInvalidateHabits() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.habits });
}

export function useSaveHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: HabitInput }) =>
      id ? updateHabit(sb(), id, input) : createHabit(sb(), input),
    onSettled: invalidate,
  });
}

export function useArchiveHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      updateHabit(sb(), id, { archived_at: archived ? new Date().toISOString() : null }),
    onSettled: invalidate,
  });
}

export function useDeleteHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({ mutationFn: (id: string) => deleteHabit(sb(), id), onSettled: invalidate });
}

/** Tick hôm nay: cập nhật lạc quan done_today / streak / week_count / last7, server tính lại sau. */
export function useToggleHabitToday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleHabit(sb(), id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.habits });
      const prev = qc.getQueryData<HabitView[]>(qk.habits);
      qc.setQueryData<HabitView[]>(qk.habits, (list) =>
        list?.map((h) => {
          if (h.id !== id) return h;
          const done = !h.done_today;
          const delta = done ? 1 : -1;
          return {
            ...h,
            done_today: done,
            streak: Math.max(0, h.streak + delta),
            week_count: Math.max(0, h.week_count + delta),
            total_count: Math.max(0, h.total_count + delta),
            last7: [...h.last7.slice(0, 6), done],
          };
        }),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.habits, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.habits }),
  });
}
