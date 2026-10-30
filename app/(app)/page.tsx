import { Page, PageHeader } from "@/components/layout/page";
import { t } from "@/messages/vi";

export default function HomePage() {
  return (
    <Page>
      <PageHeader title={t.nav.home} />
    </Page>
  );
}
