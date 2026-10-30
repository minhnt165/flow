import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { SettingsView } from "@/components/settings/settings-view";
import { DEMO_USER } from "@/lib/demo/fixtures";
import { DEMO_MODE } from "@/lib/demo/mode";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getServerClient } from "@/lib/supabase/server";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.settings.title };

export default async function SettingsPage() {
  const email = DEMO_MODE
    ? DEMO_USER.email
    : ((await getCurrentUser(await getServerClient()))?.email ?? "");
  return (
    <Page glowColor="rgb(125 211 252 / 0.12)">
      <Suspense>
        <SettingsView email={email} />
      </Suspense>
    </Page>
  );
}
