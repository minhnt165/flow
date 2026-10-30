"use client";

import { useMemo } from "react";
import { useCategories } from "@/hooks/use-categories";
import { useFunds } from "@/hooks/use-funds";
import type { Category, FundWithBalance } from "@/lib/supabase/types";

/** Tra quỹ / danh mục theo id để hiển thị giao dịch. */
export function useLookups() {
  const funds = useFunds();
  const categories = useCategories();
  return useMemo(() => {
    const fundById = new Map<string, FundWithBalance>((funds.data ?? []).map((f) => [f.id, f]));
    const catById = new Map<string, Category>((categories.data ?? []).map((c) => [c.id, c]));
    return {
      funds: funds.data ?? [],
      categories: categories.data ?? [],
      fundById,
      catById,
      defaultFund: (funds.data ?? []).find((f) => f.is_default),
      isLoading: funds.isLoading || categories.isLoading,
    };
  }, [funds.data, categories.data, funds.isLoading, categories.isLoading]);
}
