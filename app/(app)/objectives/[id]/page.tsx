import type { Metadata } from "next";
import { Page } from "@/components/layout/page";
import { ObjectiveDetail } from "@/components/objectives/objective-detail";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.objectives.title };

export default async function ObjectivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page>
      <ObjectiveDetail id={id} />
    </Page>
  );
}
