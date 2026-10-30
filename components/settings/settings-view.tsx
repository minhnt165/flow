"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page";
import { AccountTab } from "@/components/settings/account-tab";
import { DataTab } from "@/components/settings/data-tab";
import { NotificationsTab } from "@/components/settings/notifications-tab";
import { WalletsTab } from "@/components/settings/wallets-tab";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

const TABS = ["account", "notifications", "wallets", "data"] as const;
type Tab = (typeof TABS)[number];

export function SettingsView({ email }: { email: string }) {
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "notifications";

  return (
    <>
      <div className="relative flex flex-col gap-[18px]">
        <PageHeader title={t.settings.title} />
        <nav
          aria-label={t.settings.tabsLabel}
          className="flex gap-1.5 overflow-x-auto border-b border-surface-2"
        >
          {TABS.map((k) => (
            <Link
              key={k}
              href={`/settings?tab=${k}`}
              scroll={false}
              aria-current={tab === k ? "page" : undefined}
              className={cn(
                "-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3.5 text-sm no-underline",
                tab === k
                  ? "border-accent font-semibold text-text hover:text-text"
                  : "border-transparent font-medium text-muted-foreground hover:text-text",
              )}
            >
              {t.settings.tabs[k]}
            </Link>
          ))}
        </nav>
      </div>
      {tab === "account" && <AccountTab email={email} />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "wallets" && <WalletsTab />}
      {tab === "data" && <DataTab />}
    </>
  );
}
