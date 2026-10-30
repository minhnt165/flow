"use client";

import { useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { Segmented } from "@/components/common/segmented";
import { SearchBox, TransactionList } from "@/components/expenses/transaction-list";
import { useMonth } from "@/hooks/use-month";
import { useTransactions } from "@/hooks/use-transactions";
import type { TransactionType } from "@/lib/supabase/types";
import { t } from "@/messages/vi";

type Filter = "all" | TransactionType;

export function TransactionsView() {
  const params = useSearchParams();
  const initial = params.get("type");
  const [filter, setFilter] = useState<Filter>(
    initial === "expense" || initial === "income" || initial === "transfer" ? initial : "all",
  );
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const { range } = useMonth();
  const q = useTransactions({
    ...range,
    types: filter === "all" ? undefined : [filter],
    search: deferred || undefined,
    limit: 500,
  });

  return (
    <div className="relative flex flex-col md:card md:px-6 md:pt-2 md:pb-3">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 md:py-4">
        <Segmented<Filter>
          label={t.expenses.filterLabel}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t.expenses.filterAll },
            { value: "expense", label: t.expenses.filterExpense },
            { value: "income", label: t.expenses.filterIncome },
            { value: "transfer", label: t.expenses.filterTransfer },
          ]}
        />
        <SearchBox value={search} onChange={setSearch} className="w-full sm:w-auto" />
      </div>
      <TransactionList
        transactions={q.data}
        isLoading={q.isLoading}
        isError={q.isError}
        onRetry={() => q.refetch()}
        searching={Boolean(deferred) || filter !== "all"}
      />
    </div>
  );
}
