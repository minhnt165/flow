import type { Metadata } from "next";
import { Suspense } from "react";
import { AddFab, ExpensesHeader } from "@/components/expenses/expenses-header";
import { Page } from "@/components/layout/page";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.expenses.title };

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Page>
      <Suspense>
        <ExpensesHeader />
        {children}
      </Suspense>
      <AddFab />
    </Page>
  );
}
