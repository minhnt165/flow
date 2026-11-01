import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, ProfileUpdate } from "./types";

/** Tên hiện ở sidebar: tên hiển thị, chưa đặt thì lấy phần trước @ của email. */
export function accountName(displayName: string | null | undefined, email: string) {
  return displayName || email.split("@")[0] || "Bạn";
}

export async function getProfile(sb: SupabaseClient): Promise<Profile | null> {
  const { data, error } = await sb.from("profiles").select("*").maybeSingle<Profile>();
  if (error) throw error;
  return data;
}

/** Tự tạo hồ sơ + dữ liệu mặc định nếu thiếu (tài khoản đăng ký trước khi có trigger). */
export async function ensureProfile(sb: SupabaseClient): Promise<Profile> {
  const { data, error } = await sb.rpc("ensure_profile");
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(sb: SupabaseClient, id: string, patch: ProfileUpdate) {
  const { data, error } = await sb
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single<Profile>();
  if (error) throw error;
  return data;
}
