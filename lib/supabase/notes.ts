import type { SupabaseClient } from "@supabase/supabase-js";
import type { Note, NoteInput } from "./types";

/** Ghi chú: ghim trước, rồi sửa gần nhất trước. */
export async function listNotes(sb: SupabaseClient): Promise<Note[]> {
  const { data, error } = await sb
    .from("notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function createNote(sb: SupabaseClient, input: NoteInput) {
  const { data, error } = await sb.from("notes").insert(input).select("*").single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(sb: SupabaseClient, id: string, patch: Partial<NoteInput>) {
  const { data, error } = await sb.from("notes").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("notes").delete().eq("id", id);
  if (error) throw error;
}
