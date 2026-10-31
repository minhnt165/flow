import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonthlyTotal, MonthSummary } from "./types";

/** fn_month_summary(user, month): tổng chi, tổng thu, chi theo danh mục. */
export async function getMonthSummary(
  sb: SupabaseClient,
  userId: string,
  month: string,
): Promise<MonthSummary> {
  const { data, error } = await sb.rpc("fn_month_summary", { p_user_id: userId, p_month: month });
  if (error) throw error;
  return data as MonthSummary;
}

/** fn_monthly_totals: tổng chi / thu của `months` tháng liên tiếp kết thúc tại `month`, cũ → mới. */
export async function getMonthlyTotals(
  sb: SupabaseClient,
  userId: string,
  month: string,
  months = 6,
): Promise<MonthlyTotal[]> {
  const { data, error } = await sb.rpc("fn_monthly_totals", {
    p_user_id: userId,
    p_month: month,
    p_months: months,
  });
  if (error) throw error;
  return (data ?? []) as MonthlyTotal[];
}
