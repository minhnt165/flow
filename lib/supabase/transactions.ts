import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction, TransactionInput, TransactionType } from "./types";

export type TransactionFilter = {
  /** ISO, bao gồm */
  from?: string;
  /** ISO, không bao gồm */
  to?: string;
  search?: string;
  types?: TransactionType[];
  fundId?: string;
  categoryId?: string;
  limit?: number;
};

/** Escape ký tự đặc biệt của PostgREST `or=(...)` và ILIKE. */
function likeTerm(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[(),"]/g, " ");
}

export async function listTransactions(
  sb: SupabaseClient,
  f: TransactionFilter = {},
): Promise<Transaction[]> {
  let q = sb.from("transactions").select("*").order("occurred_at", { ascending: false });
  if (f.from) q = q.gte("occurred_at", f.from);
  if (f.to) q = q.lt("occurred_at", f.to);
  if (f.types?.length) q = q.in("type", f.types);
  if (f.fundId) q = q.or(`fund_id.eq.${f.fundId},to_fund_id.eq.${f.fundId}`);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  const term = f.search?.trim();
  if (term) {
    // Gõ toàn số (vd "65.000") thì tìm đúng số tiền, còn lại tìm trong ghi chú.
    q = /^[\d.\s]+$/.test(term)
      ? q.eq("amount", Number(term.replace(/\D/g, "")))
      : q.ilike("note", `%${likeTerm(term)}%`);
  }
  q = q.limit(f.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function createTransaction(sb: SupabaseClient, input: TransactionInput) {
  const { data, error } = await sb
    .from("transactions")
    .insert({ ...input, source: "web" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  sb: SupabaseClient,
  id: string,
  patch: Partial<TransactionInput>,
) {
  const { data, error } = await sb
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

/** Toàn bộ giao dịch để xuất CSV (phân trang 1000 dòng/lần). */
export async function listAllTransactions(sb: SupabaseClient): Promise<Transaction[]> {
  const out: Transaction[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("transactions")
      .select("*")
      .order("occurred_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Transaction[]));
    if (!data || data.length < 1000) return out;
  }
}
