import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, ProfileUpdate } from "./types";

export async function getProfile(sb: SupabaseClient): Promise<Profile | null> {
  const { data, error } = await sb.from("profiles").select("*").maybeSingle<Profile>();
  if (error) throw error;
  return data;
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
