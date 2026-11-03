import type { Metadata } from "next";
import { Page } from "@/components/layout/page";
import { ObjectivesView } from "@/components/objectives/objectives-view";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.objectives.title };

export default function ObjectivesPage() {
  return (
    <Page>
      <ObjectivesView />
    </Page>
  );
}
