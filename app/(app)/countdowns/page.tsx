import type { Metadata } from "next";
import { CountdownsView } from "@/components/countdowns/countdowns-view";
import { Page } from "@/components/layout/page";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.countdowns.title };

export default function CountdownsPage() {
  return (
    <Page>
      <CountdownsView />
    </Page>
  );
}
