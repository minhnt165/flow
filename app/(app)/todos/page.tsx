import type { Metadata } from "next";
import { Page } from "@/components/layout/page";
import { TodosView } from "@/components/todos/todos-view";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.todos.title };

export default function TodosPage() {
  return (
    <Page>
      <TodosView />
    </Page>
  );
}
