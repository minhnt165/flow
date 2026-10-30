"use client";

import { useLookups } from "@/hooks/use-lookups";
import { useProfile } from "@/hooks/use-profile";
import { useRecurringRules, useTransactions } from "@/hooks/use-transactions";

/**
 * Lương mỗi kỳ (khoản thu gần nhất thuộc danh mục "Lương") và tổng các khoản đang tự động
 * chuyển đi sau lương, dùng cho cột "Kế hoạch của bạn".
 */
export function useSalaryContext(excludeFundId?: string) {
  const profile = useProfile();
  const { categories, defaultFund } = useLookups();
  const salaryCat = categories.find((c) => c.type === "income" && c.name === "Lương");
  const lastSalary = useTransactions(
    { types: ["income"], categoryId: salaryCat?.id, limit: 1 },
    Boolean(salaryCat),
  );
  const rules = useRecurringRules();
  const commitments = (rules.data ?? [])
    .filter((r) => r.kind === "transfer" && r.run_after_salary && r.to_fund_id !== excludeFundId)
    .reduce((s, r) => s + r.amount, 0);

  return {
    salaryDay: profile.data?.salary_day ?? 1,
    salary: lastSalary.data?.[0]?.amount ?? 0,
    commitments,
    defaultFund,
  };
}
