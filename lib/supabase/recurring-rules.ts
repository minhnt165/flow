import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecurringRule } from "./types";

export async function listRecurringRules(sb: SupabaseClient): Promise<RecurringRule[]> {
  const { data, error } = await sb
    .from("recurring_rules")
    .select("*")
    .eq("active", true)
    .order("next_run_on");
  if (error) throw error;
  return (data ?? []) as RecurringRule[];
}

export type RecurringTransferInput = {
  amount: number;
  fund_id: string;
  to_fund_id: string;
  day_of_month: number;
  next_run_on: string;
  name?: string | null;
};

/** "Lặp lại hằng tháng sau lương" ở hộp thoại chuyển quỹ. */
export async function createSalaryTransferRule(sb: SupabaseClient, input: RecurringTransferInput) {
  const { data, error } = await sb
    .from("recurring_rules")
    .insert({ ...input, kind: "transfer", run_after_salary: true })
    .select("*")
    .single();
  if (error) throw error;
  return data as RecurringRule;
}

export async function deactivateRule(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("recurring_rules").update({ active: false }).eq("id", id);
  if (error) throw error;
}
