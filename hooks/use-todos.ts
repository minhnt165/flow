"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import { createTodo, deleteTodo, deleteTodos, listTodos, updateTodo } from "@/lib/supabase/todos";
import type { TodoInput, TodoView } from "@/lib/supabase/types";

const sb = () => getBrowserClient();

export function useTodos() {
  return useQuery({ queryKey: qk.todos, queryFn: () => listTodos(sb()) });
}

function useInvalidateTodos() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.todos });
}

export function useSaveTodo() {
  const invalidate = useInvalidateTodos();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TodoInput }) =>
      id ? updateTodo(sb(), id, input) : createTodo(sb(), input),
    onSettled: invalidate,
  });
}

/** Đánh dấu xong / chưa xong, cập nhật lạc quan để ô tick phản hồi ngay. */
export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateTodo(sb(), id, { done_at: done ? new Date().toISOString() : null }),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: qk.todos });
      const prev = qc.getQueryData<TodoView[]>(qk.todos);
      qc.setQueryData<TodoView[]>(qk.todos, (list) =>
        list?.map((t) =>
          t.id === id ? { ...t, done, done_at: done ? new Date().toISOString() : null } : t,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.todos, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.todos }),
  });
}

export function useDeleteTodo() {
  const invalidate = useInvalidateTodos();
  return useMutation({ mutationFn: (id: string) => deleteTodo(sb(), id), onSettled: invalidate });
}

export function useClearDoneTodos() {
  const invalidate = useInvalidateTodos();
  return useMutation({
    mutationFn: (ids: string[]) => deleteTodos(sb(), ids),
    onSettled: invalidate,
  });
}
