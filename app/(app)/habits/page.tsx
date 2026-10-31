import type { Metadata } from "next";
import { HabitsView } from "@/components/habits/habits-view";
import { Page } from "@/components/layout/page";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.habits.title };

export default function HabitsPage() {
  return (
    <Page>
      <HabitsView />
    </Page>
  );
}
