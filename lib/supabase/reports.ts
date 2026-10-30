import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonthSummary } from "./types";

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
