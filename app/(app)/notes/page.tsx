import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/coming-soon";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.nav.notes };

export default function Page() {
  return <ComingSoon title={t.nav.notes} />;
}
