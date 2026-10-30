"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  createCountdown,
  deleteCountdown,
  listCountdowns,
  updateCountdown,
} from "@/lib/supabase/countdowns";
import type { CountdownInput } from "@/lib/supabase/types";

const sb = () => getBrowserClient();

export function useCountdowns() {
  return useQuery({ queryKey: qk.countdowns, queryFn: () => listCountdowns(sb()) });
}

function useInvalidate() {
  const qc = useQueryClient();
  // Gắn / bỏ gắn countdown làm thay đổi hạn của quỹ mục tiêu.
  return () =>
    Promise.all(
      [qk.countdowns, qk.funds, qk.goals].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );
}

export function useSaveCountdown() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CountdownInput }) =>
      id ? updateCountdown(sb(), id, input) : createCountdown(sb(), input),
    onSettled: invalidate,
  });
}

export function useLinkCountdownFund() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, fundId }: { id: string; fundId: string | null }) =>
      updateCountdown(sb(), id, { fund_id: fundId }),
    onSettled: invalidate,
  });
}

export function useDeleteCountdown() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deleteCountdown(sb(), id),
    onSettled: invalidate,
  });
}
