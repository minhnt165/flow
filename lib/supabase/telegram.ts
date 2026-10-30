import type { SupabaseClient } from "@supabase/supabase-js";

export type LinkCode = { code: string; expires_at: string };

/** RPC create_telegram_link_code(): mã 6 ký tự, hết hạn sau 10 phút. */
export async function createLinkCode(sb: SupabaseClient): Promise<LinkCode> {
  const { data, error } = await sb.rpc("create_telegram_link_code");
  if (error) throw error;
  return data as LinkCode;
}

export async function disconnectTelegram(sb: SupabaseClient) {
  const { error } = await sb.rpc("disconnect_telegram");
  if (error) throw error;
}

/**
 * "Gửi tin thử": token bot chỉ nằm trong Supabase secrets nên gửi qua Edge Function
 * telegram-test (có kiểm tra JWT) thay vì RPC SQL.
 */
export async function sendTestMessage(sb: SupabaseClient) {
  const { error } = await sb.functions.invoke("telegram-test", { method: "POST" });
  if (error) throw error;
}

/** "7X4K29" → "7X4K-29" để dễ đọc. */
export function formatLinkCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
