"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk, TRANSACTION_DEPENDENTS } from "@/lib/query-keys";
import { createBill, deleteBill, listBills, payBill, updateBill } from "@/lib/supabase/bills";
import { getBrowserClient } from "@/lib/supabase/client";
import type { BillInput } from "@/lib/supabase/types";

const sb = () => getBrowserClient();

export function useBills() {
  return useQuery({ queryKey: qk.bills, queryFn: () => listBills(sb()) });
}

function useInvalidateBills() {
  const qc = useQueryClient();
  return () =>
    Promise.all([qk.bills, qk.rules].map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useSaveBill() {
  const invalidate = useInvalidateBills();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BillInput }) =>
      id ? updateBill(sb(), id, input) : createBill(sb(), input),
    onSettled: invalidate,
  });
}

export function useToggleBill() {
  const invalidate = useInvalidateBills();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateBill(sb(), id, { active }),
    onSettled: invalidate,
  });
}

export function useDeleteBill() {
  const invalidate = useInvalidateBills();
  return useMutation({ mutationFn: (id: string) => deleteBill(sb(), id), onSettled: invalidate });
}

/** Đánh dấu đã trả: tạo giao dịch chi nên làm mới cả số dư, ngân sách, danh sách giao dịch. */
export function usePayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, paidAt }: { id: string; amount?: number; paidAt?: string }) =>
      payBill(sb(), id, { amount, paidAt }),
    onSettled: () =>
      Promise.all(
        [...TRANSACTION_DEPENDENTS.map((k) => [...k]), [...qk.rules]].map((queryKey) =>
          qc.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
