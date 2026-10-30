import type { Metadata } from "next";
import { TransactionsView } from "@/components/expenses/transactions-view";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.expenses.tabs.transactions };

export default function TransactionsPage() {
  return <TransactionsView />;
}
