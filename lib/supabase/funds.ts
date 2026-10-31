import type { SupabaseClient } from "@supabase/supabase-js";
import type { Fund, FundInput, FundMonth, FundWithBalance, GoalProgress } from "./types";

export async function listFunds(sb: SupabaseClient): Promise<FundWithBalance[]> {
  const { data, error } = await sb
    .from("v_fund_balances")
    .select("*")
    .is("archived_at", null)
    .order("is_default", { ascending: false })
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as FundWithBalance[];
}

export async function getFund(sb: SupabaseClient, id: string): Promise<FundWithBalance | null> {
  const { data, error } = await sb.from("v_fund_balances").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as FundWithBalance | null;
}

export async function getDefaultFund(sb: SupabaseClient): Promise<Fund | null> {
  const { data, error } = await sb.from("funds").select("*").eq("is_default", true).maybeSingle();
  if (error) throw error;
  return data as Fund | null;
}

export async function createFund(sb: SupabaseClient, input: FundInput): Promise<Fund> {
  const { data, error } = await sb.from("funds").insert(input).select("*").single();
  if (error) throw error;
  return data as Fund;
}

export async function updateFund(
  sb: SupabaseClient,
  id: string,
  patch: Partial<FundInput>,
): Promise<Fund> {
  const { data, error } = await sb.from("funds").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Fund;
}

/** Quỹ chưa dùng thì xoá hẳn; đã có giao dịch / hoá đơn / là nguồn tự góp thì lưu trữ. */
export async function removeFund(sb: SupabaseClient, id: string): Promise<"deleted" | "archived"> {
  const { data, error } = await sb.rpc("fn_remove_fund", { p_fund_id: id });
  if (error) throw error;
  return data as "deleted" | "archived";
}

export async function setDefaultFund(sb: SupabaseClient, id: string) {
  const { error } = await sb.rpc("fn_set_default_fund", { p_fund_id: id });
  if (error) throw error;
}

/** Ngân sách các quỹ monthly_budget trong tháng chứa `month` (YYYY-MM-DD); bỏ trống = tháng này. */
export async function listFundMonth(sb: SupabaseClient, month?: string): Promise<FundMonth[]> {
  const { data, error } = await sb.rpc("fn_budget_month", { p_month: month ?? null });
  if (error) throw error;
  return (data ?? []) as FundMonth[];
}

export async function listGoalProgress(sb: SupabaseClient): Promise<GoalProgress[]> {
  const { data, error } = await sb.from("v_fund_goal_progress").select("*");
  if (error) throw error;
  return (data ?? []) as GoalProgress[];
}

export async function getGoalProgress(
  sb: SupabaseClient,
  fundId: string,
): Promise<GoalProgress | null> {
  const { data, error } = await sb
    .from("v_fund_goal_progress")
    .select("*")
    .eq("fund_id", fundId)
    .maybeSingle();
  if (error) throw error;
  return data as GoalProgress | null;
}

export async function getFundMonthlyInflow(
  sb: SupabaseClient,
  fundId: string,
  months = 6,
): Promise<{ month_start: string; amount: number }[]> {
  const { data, error } = await sb.rpc("fn_fund_monthly_inflow", {
    p_fund_id: fundId,
    p_months: months,
  });
  if (error) throw error;
  return (data ?? []) as { month_start: string; amount: number }[];
}
