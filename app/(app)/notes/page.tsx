import type { Metadata } from "next";
import { Page } from "@/components/layout/page";
import { NotesView } from "@/components/notes/notes-view";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.notes.title };

export default function NotesPage() {
  return (
    <Page>
      <NotesView />
    </Page>
  );
}
