import type { SupabaseClient } from "@supabase/supabase-js";

/** RPC delete_account(): xoá auth.users của chính mình, dữ liệu xoá dây chuyền theo khoá ngoại. */
export async function deleteAccount(sb: SupabaseClient) {
  const { error } = await sb.rpc("delete_account");
  if (error) throw error;
  await sb.auth.signOut().catch(() => undefined);
}
