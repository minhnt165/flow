import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Objective,
  ObjectiveInput,
  ObjectiveOutput,
  ObjectiveOutputInput,
  ObjectiveView,
} from "./types";

/** Mục tiêu kèm buổi tuần này, tổng buổi và đếm kết quả đầu ra (view v_objectives). */
export async function listObjectives(sb: SupabaseClient): Promise<ObjectiveView[]> {
  const { data, error } = await sb
    .from("v_objectives")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as ObjectiveView[];
}

export async function getObjective(sb: SupabaseClient, id: string): Promise<ObjectiveView | null> {
  const { data, error } = await sb.from("v_objectives").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ObjectiveView | null;
}

export async function createObjective(sb: SupabaseClient, input: ObjectiveInput) {
  const { data, error } = await sb.from("objectives").insert(input).select("*").single();
  if (error) throw error;
  return data as Objective;
}

export async function updateObjective(
  sb: SupabaseClient,
  id: string,
  patch: Partial<ObjectiveInput> & { completed_at?: string | null },
) {
  const { data, error } = await sb
    .from("objectives")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Objective;
}

export async function deleteObjective(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("objectives").delete().eq("id", id);
  if (error) throw error;
}

/** Bật / tắt một buổi (mặc định hôm nay). Trả về trạng thái sau khi đổi. */
export async function toggleObjectiveSession(
  sb: SupabaseClient,
  id: string,
  day?: string,
): Promise<boolean> {
  const { data, error } = await sb.rpc("fn_toggle_objective_session", {
    p_objective_id: id,
    p_day: day ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Ngày đã làm của một mục tiêu, mới nhất trước. */
export async function listObjectiveSessions(sb: SupabaseClient, id: string): Promise<string[]> {
  const { data, error } = await sb
    .from("objective_sessions")
    .select("day")
    .eq("objective_id", id)
    .order("day", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as { day: string }[]).map((r) => r.day);
}

export async function listObjectiveOutputs(
  sb: SupabaseClient,
  id: string,
): Promise<ObjectiveOutput[]> {
  const { data, error } = await sb
    .from("objective_outputs")
    .select("*")
    .eq("objective_id", id)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as ObjectiveOutput[];
}

export async function createObjectiveOutputs(sb: SupabaseClient, inputs: ObjectiveOutputInput[]) {
  if (inputs.length === 0) return;
  const { error } = await sb.from("objective_outputs").insert(inputs);
  if (error) throw error;
}

export async function updateObjectiveOutput(
  sb: SupabaseClient,
  id: string,
  patch: Partial<Pick<ObjectiveOutput, "title" | "due_on" | "done_at">>,
) {
  const { error } = await sb.from("objective_outputs").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteObjectiveOutput(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("objective_outputs").delete().eq("id", id);
  if (error) throw error;
}
