import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { MODULES, SETTINGS_ITEM } from "@/lib/nav";
import { t } from "@/messages/vi";

export const metadata: Metadata = { title: t.nav.more };

// Tab "Khác" trên điện thoại: các module không có tab riêng, Cài đặt và Đăng xuất.
export default function MorePage() {
  const items = [...MODULES.slice(3), SETTINGS_ITEM];
  return (
    <Page>
      <PageHeader title={t.nav.more} />
      <div className="relative flex flex-col card px-5 py-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 items-center gap-3.5 text-text no-underline hover:text-text ${i > 0 ? "border-t border-surface-2" : ""}`}
            >
              <span className="flex size-10 items-center justify-center rounded-[14px] bg-surface-2">
                <Icon className="size-5 text-muted-foreground" aria-hidden />
              </span>
              <span className="grow text-[15px] font-medium">{item.label}</span>
              <ChevronRight className="size-4 text-dim" aria-hidden />
            </Link>
          );
        })}
      </div>
      <form action={logout} className="relative">
        <Button type="submit" variant="danger" size="form" className="w-full">
          {t.nav.signOut}
        </Button>
      </form>
    </Page>
  );
}
