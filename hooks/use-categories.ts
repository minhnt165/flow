"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryInput,
} from "@/lib/supabase/categories";
import { getBrowserClient } from "@/lib/supabase/client";

const sb = () => getBrowserClient();

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => listCategories(sb()),
    staleTime: 5 * 60_000,
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CategoryInput }) =>
      id ? updateCategory(sb(), id, input) : createCategory(sb(), input),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.categories }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(sb(), id),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.categories }),
  });
}
