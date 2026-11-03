"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  createObjective,
  createObjectiveOutputs,
  deleteObjective,
  deleteObjectiveOutput,
  getObjective,
  listObjectiveOutputs,
  listObjectives,
  listObjectiveSessions,
  toggleObjectiveSession,
  updateObjective,
  updateObjectiveOutput,
} from "@/lib/supabase/objectives";
import type {
  ObjectiveInput,
  ObjectiveOutput,
  ObjectiveOutputInput,
  ObjectiveView,
} from "@/lib/supabase/types";

const sb = () => getBrowserClient();

export function useObjectives() {
  return useQuery({ queryKey: qk.objectives, queryFn: () => listObjectives(sb()) });
}

export function useObjective(id: string) {
  return useQuery({ queryKey: qk.objective(id), queryFn: () => getObjective(sb(), id) });
}

export function useObjectiveOutputs(id: string) {
  return useQuery({
    queryKey: qk.objectiveOutputs(id),
    queryFn: () => listObjectiveOutputs(sb(), id),
  });
}

export function useObjectiveSessions(id: string) {
  return useQuery({
    queryKey: qk.objectiveSessions(id),
    queryFn: () => listObjectiveSessions(sb(), id),
  });
}

/** Mọi truy vấn mục tiêu dùng chung tiền tố ["objectives"]. */
function useInvalidateObjectives() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.objectives });
}

/** Tạo mới kèm danh sách kết quả đầu ra, hoặc sửa thông tin mục tiêu. Trả về id. */
export function useSaveObjective() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      outputs = [],
    }: {
      id?: string;
      input: ObjectiveInput;
      outputs?: Omit<ObjectiveOutputInput, "objective_id">[];
    }) => {
      if (id) return (await updateObjective(sb(), id, input)).id;
      const created = await createObjective(sb(), input);
      await createObjectiveOutputs(
        sb(),
        outputs.map((o, i) => ({ ...o, objective_id: created.id, sort_order: i })),
      );
      return created.id;
    },
    onSettled: invalidate,
  });
}

export function useCompleteObjective() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateObjective(sb(), id, { completed_at: done ? new Date().toISOString() : null }),
    onSettled: invalidate,
  });
}

export function useDeleteObjective() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: (id: string) => deleteObjective(sb(), id),
    onSettled: invalidate,
  });
}

/** Tick buổi hôm nay: cập nhật lạc quan danh sách + chi tiết, server tính lại sau. */
export function useToggleObjectiveToday() {
  const qc = useQueryClient();
  const bump = (o: ObjectiveView): ObjectiveView => {
    const delta = o.done_today ? -1 : 1;
    return {
      ...o,
      done_today: !o.done_today,
      week_count: Math.max(0, o.week_count + delta),
      total_sessions: Math.max(0, o.total_sessions + delta),
    };
  };
  return useMutation({
    mutationFn: (id: string) => toggleObjectiveSession(sb(), id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.objectives });
      const prevList = qc.getQueryData<ObjectiveView[]>(qk.objectives);
      const prevOne = qc.getQueryData<ObjectiveView | null>(qk.objective(id));
      qc.setQueryData<ObjectiveView[]>(qk.objectives, (list) =>
        list?.map((o) => (o.id === id ? bump(o) : o)),
      );
      qc.setQueryData<ObjectiveView | null>(qk.objective(id), (o) => (o ? bump(o) : o));
      return { prevList, prevOne };
    },
    onError: (_e, id, ctx) => {
      if (ctx?.prevList) qc.setQueryData(qk.objectives, ctx.prevList);
      if (ctx?.prevOne) qc.setQueryData(qk.objective(id), ctx.prevOne);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.objectives }),
  });
}

export function useAddObjectiveOutput() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: (input: ObjectiveOutputInput) => createObjectiveOutputs(sb(), [input]),
    onSettled: invalidate,
  });
}

/** Tick / bỏ tick một kết quả đầu ra (cập nhật lạc quan danh sách kết quả). */
export function useToggleObjectiveOutput(objectiveId: string) {
  const qc = useQueryClient();
  const key = qk.objectiveOutputs(objectiveId);
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateObjectiveOutput(sb(), id, { done_at: done ? new Date().toISOString() : null }),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ObjectiveOutput[]>(key);
      qc.setQueryData<ObjectiveOutput[]>(key, (list) =>
        list?.map((o) =>
          o.id === id ? { ...o, done_at: done ? new Date().toISOString() : null } : o,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.objectives }),
  });
}

export function useDeleteObjectiveOutput() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: (id: string) => deleteObjectiveOutput(sb(), id),
    onSettled: invalidate,
  });
}
