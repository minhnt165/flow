import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, CategoryType, PaletteColor } from "./types";

export async function listCategories(sb: SupabaseClient): Promise<Category[]> {
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("type")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export type CategoryInput = {
  name: string;
  icon: string;
  color: PaletteColor;
  type: CategoryType;
  sort_order?: number;
};

export async function createCategory(sb: SupabaseClient, input: CategoryInput) {
  const { data, error } = await sb.from("categories").insert(input).select("*").single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(
  sb: SupabaseClient,
  id: string,
  patch: Partial<CategoryInput>,
) {
  const { data, error } = await sb
    .from("categories")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Category;
}

/** Xoá danh mục chưa có giao dịch; danh mục đã dùng sẽ báo lỗi khoá ngoại (23503). */
export async function deleteCategory(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
}
