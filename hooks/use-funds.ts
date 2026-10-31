"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  createFund,
  getFund,
  getFundMonthlyInflow,
  getGoalProgress,
  listFundMonth,
  listFunds,
  listGoalProgress,
  removeFund,
  setDefaultFund,
  updateFund,
} from "@/lib/supabase/funds";
import type { FundInput } from "@/lib/supabase/types";

const sb = () => getBrowserClient();

export function useFunds() {
  return useQuery({ queryKey: qk.funds, queryFn: () => listFunds(sb()) });
}

export function useFund(id: string) {
  return useQuery({ queryKey: qk.fund(id), queryFn: () => getFund(sb(), id) });
}

/** Ngân sách tháng của các quỹ monthly_budget; `month` = "YYYY-MM-01". */
export function useFundMonth(month: string) {
  return useQuery({ queryKey: qk.fundMonth(month), queryFn: () => listFundMonth(sb(), month) });
}

export function useGoals() {
  return useQuery({ queryKey: qk.goals, queryFn: () => listGoalProgress(sb()) });
}

export function useGoal(id: string) {
  return useQuery({ queryKey: qk.goal(id), queryFn: () => getGoalProgress(sb(), id) });
}

export function useFundInflow(id: string, months = 6) {
  return useQuery({
    queryKey: [...qk.fundInflow(id), months],
    queryFn: () => getFundMonthlyInflow(sb(), id, months),
  });
}

function useInvalidateFunds() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [qk.funds, ["fund-month"], qk.goals, qk.rules, qk.countdowns].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
}

export function useSaveFund() {
  const invalidate = useInvalidateFunds();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: FundInput }) =>
      id ? updateFund(sb(), id, input) : createFund(sb(), input),
    onSettled: invalidate,
  });
}

export function useUpdateFund() {
  const invalidate = useInvalidateFunds();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FundInput> }) =>
      updateFund(sb(), id, patch),
    onSettled: invalidate,
  });
}

export function useRemoveFund() {
  const invalidate = useInvalidateFunds();
  return useMutation({ mutationFn: (id: string) => removeFund(sb(), id), onSettled: invalidate });
}

export function useSetDefaultFund() {
  const invalidate = useInvalidateFunds();
  return useMutation({
    mutationFn: (id: string) => setDefaultFund(sb(), id),
    onSettled: invalidate,
  });
}
