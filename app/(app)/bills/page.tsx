import type { Metadata } from "next";
import { BillsView } from "@/components/bills/bills-view";
import { Page } from "@/components/layout/page";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.bills.title };

export default function BillsPage() {
  return (
    <Page>
      <BillsView />
    </Page>
  );
}
