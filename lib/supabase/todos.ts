import type { SupabaseClient } from "@supabase/supabase-js";
import type { TodoInput, TodoView } from "./types";

/** Việc cần làm kèm days_left và cờ done (view v_todos); hạn gần trước, không hạn ở cuối. */
export async function listTodos(sb: SupabaseClient): Promise<TodoView[]> {
  const { data, error } = await sb
    .from("v_todos")
    .select("*")
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TodoView[];
}

export async function createTodo(sb: SupabaseClient, input: TodoInput) {
  const { data, error } = await sb.from("todos").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateTodo(
  sb: SupabaseClient,
  id: string,
  patch: Partial<TodoInput> & { done_at?: string | null },
) {
  const { data, error } = await sb.from("todos").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteTodo(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("todos").delete().eq("id", id);
  if (error) throw error;
}

/** Xoá nhiều việc (dọn việc đã xong). */
export async function deleteTodos(sb: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await sb.from("todos").delete().in("id", ids);
  if (error) throw error;
}
