import type { Metadata } from "next";
import { FundsView } from "@/components/expenses/funds-view";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.expenses.tabs.funds };

export default function FundsPage() {
  return <FundsView />;
}
