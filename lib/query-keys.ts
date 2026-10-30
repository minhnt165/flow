import type { TransactionFilter } from "@/lib/supabase/transactions";

export const qk = {
  profile: ["profile"] as const,
  funds: ["funds"] as const,
  fund: (id: string) => ["funds", id] as const,
  fundMonth: (month: string) => ["fund-month", month] as const,
  goals: ["goals"] as const,
  goal: (id: string) => ["goals", id] as const,
  fundInflow: (id: string) => ["fund-inflow", id] as const,
  categories: ["categories"] as const,
  transactions: (f: TransactionFilter) => ["transactions", f] as const,
  transactionsAll: ["transactions"] as const,
  summary: (month: string) => ["summary", month] as const,
  rules: ["rules"] as const,
  countdowns: ["countdowns"] as const,
};

/** Những truy vấn phụ thuộc vào giao dịch: làm mới sau mỗi lần thêm/sửa/xoá. */
export const TRANSACTION_DEPENDENTS = [
  ["transactions"],
  ["funds"],
  ["fund-month"],
  ["goals"],
  ["fund-inflow"],
  ["summary"],
] as const;
