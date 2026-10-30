import type { SupabaseClient } from "@supabase/supabase-js";
import type { Countdown, CountdownInput, CountdownView } from "./types";

/** Countdown kèm next_occurrence, days_left, elapsed_pct, is_past (view v_countdowns). */
export async function listCountdowns(sb: SupabaseClient): Promise<CountdownView[]> {
  const { data, error } = await sb
    .from("v_countdowns")
    .select("*")
    .order("next_occurrence")
    .order("title");
  if (error) throw error;
  return (data ?? []) as CountdownView[];
}

export async function createCountdown(sb: SupabaseClient, input: CountdownInput) {
  const { data, error } = await sb.from("countdowns").insert(input).select("*").single();
  if (error) throw error;
  return data as Countdown;
}

export async function updateCountdown(
  sb: SupabaseClient,
  id: string,
  patch: Partial<CountdownInput>,
) {
  const { data, error } = await sb
    .from("countdowns")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Countdown;
}

export async function deleteCountdown(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("countdowns").delete().eq("id", id);
  if (error) throw error;
}
