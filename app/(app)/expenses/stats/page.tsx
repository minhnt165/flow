import type { Metadata } from "next";
import { StatsView } from "@/components/expenses/stats-view";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.expenses.tabs.stats };

export default function StatsPage() {
  return <StatsView />;
}
