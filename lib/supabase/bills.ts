import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillInput, BillView, PayBillResult } from "./types";

/** Hoá đơn kèm days_left, last_paid_at, paid_this_month (view v_bills), gần hạn trước. */
export async function listBills(sb: SupabaseClient): Promise<BillView[]> {
  const { data, error } = await sb.from("v_bills").select("*").order("next_run_on").order("name");
  if (error) throw error;
  return (data ?? []) as BillView[];
}

export async function createBill(sb: SupabaseClient, input: BillInput) {
  const { data, error } = await sb
    .from("recurring_rules")
    .insert({ ...input, kind: "bill", to_fund_id: null, run_after_salary: false })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateBill(sb: SupabaseClient, id: string, patch: Partial<BillInput>) {
  const { data, error } = await sb
    .from("recurring_rules")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBill(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("recurring_rules").delete().eq("id", id);
  if (error) throw error;
}

/** Ghi khoản chi cho hoá đơn và dời hạn sang kỳ sau (fn_pay_bill). */
export async function payBill(
  sb: SupabaseClient,
  id: string,
  opts: { amount?: number; paidAt?: string } = {},
): Promise<PayBillResult> {
  const { data, error } = await sb.rpc("fn_pay_bill", {
    p_rule_id: id,
    p_amount: opts.amount ?? null,
    p_paid_at: opts.paidAt ?? null,
  });
  if (error) throw error;
  return data as PayBillResult;
}
