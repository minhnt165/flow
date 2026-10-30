"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useUserId } from "@/components/session";
import { qk, TRANSACTION_DEPENDENTS } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import { getMonthSummary } from "@/lib/supabase/reports";
import { createSalaryTransferRule, listRecurringRules } from "@/lib/supabase/recurring-rules";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
  type TransactionFilter,
} from "@/lib/supabase/transactions";
import type { Transaction, TransactionInput } from "@/lib/supabase/types";
import type { RecurringTransferInput } from "@/lib/supabase/recurring-rules";

const sb = () => getBrowserClient();

export function useTransactions(filter: TransactionFilter, enabled = true) {
  return useQuery({
    queryKey: qk.transactions(filter),
    queryFn: () => listTransactions(sb(), filter),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useMonthSummary(month: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.summary(month),
    queryFn: () => getMonthSummary(sb(), userId!, month),
    enabled: Boolean(userId),
  });
}

export function useRecurringRules() {
  return useQuery({ queryKey: qk.rules, queryFn: () => listRecurringRules(sb()) });
}

type Snapshot = [QueryKey, Transaction[] | undefined][];

function matches(tx: Transaction, key: QueryKey) {
  const f = (key[1] ?? {}) as TransactionFilter;
  if (f.from && tx.occurred_at < f.from) return false;
  if (f.to && tx.occurred_at >= f.to) return false;
  if (f.types?.length && !f.types.includes(tx.type)) return false;
  if (f.fundId && tx.fund_id !== f.fundId && tx.to_fund_id !== f.fundId) return false;
  if (f.search) return false;
  return true;
}

/** Thêm / sửa / xoá giao dịch với cập nhật lạc quan cho mọi danh sách đang hiển thị. */
export function useTransactionMutations() {
  const qc = useQueryClient();

  const snapshot = async (): Promise<Snapshot> => {
    await qc.cancelQueries({ queryKey: qk.transactionsAll });
    return qc.getQueriesData<Transaction[]>({ queryKey: qk.transactionsAll });
  };
  const rollback = (snap?: Snapshot) => snap?.forEach(([key, data]) => qc.setQueryData(key, data));
  const refresh = () =>
    Promise.all(
      TRANSACTION_DEPENDENTS.map((queryKey) => qc.invalidateQueries({ queryKey: [...queryKey] })),
    );

  const create = useMutation({
    mutationFn: (input: TransactionInput) => createTransaction(sb(), input),
    onMutate: async (input) => {
      const snap = await snapshot();
      const optimistic: Transaction = {
        ...input,
        id: `optimistic-${Date.now()}`,
        user_id: "",
        source: "web",
        recurring_rule_id: null,
        created_at: new Date().toISOString(),
      };
      for (const [key, data] of snap) {
        if (!data || !matches(optimistic, key)) continue;
        const next = [optimistic, ...data].sort((a, b) =>
          b.occurred_at.localeCompare(a.occurred_at),
        );
        qc.setQueryData(key, next);
      }
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.snap),
    onSettled: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      updateTransaction(sb(), id, input),
    onMutate: async ({ id, input }) => {
      const snap = await snapshot();
      for (const [key, data] of snap) {
        if (data)
          qc.setQueryData(
            key,
            data.map((t) => (t.id === id ? { ...t, ...input } : t)),
          );
      }
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.snap),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTransaction(sb(), id),
    onMutate: async (id) => {
      const snap = await snapshot();
      for (const [key, data] of snap) {
        if (data)
          qc.setQueryData(
            key,
            data.filter((t) => t.id !== id),
          );
      }
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx?.snap),
    onSettled: refresh,
  });

  const createRule = useMutation({
    mutationFn: (input: RecurringTransferInput) => createSalaryTransferRule(sb(), input),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.rules }),
  });

  return { create, update, remove, createRule };
}
