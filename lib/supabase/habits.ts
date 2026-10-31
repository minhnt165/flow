import type { SupabaseClient } from "@supabase/supabase-js";
import type { HabitInput, HabitView } from "./types";

/** Thói quen kèm done_today, streak, week_count, last7 (view v_habits). */
export async function listHabits(sb: SupabaseClient): Promise<HabitView[]> {
  const { data, error } = await sb
    .from("v_habits")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as HabitView[];
}

export async function createHabit(sb: SupabaseClient, input: HabitInput) {
  const { data, error } = await sb.from("habits").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateHabit(
  sb: SupabaseClient,
  id: string,
  patch: Partial<HabitInput> & { archived_at?: string | null },
) {
  const { data, error } = await sb.from("habits").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteHabit(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("habits").delete().eq("id", id);
  if (error) throw error;
}

/** Bật / tắt một ngày (mặc định hôm nay). Trả về trạng thái sau khi đổi. */
export async function toggleHabit(sb: SupabaseClient, id: string, day?: string): Promise<boolean> {
  const { data, error } = await sb.rpc("fn_toggle_habit", {
    p_habit_id: id,
    p_day: day ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}
