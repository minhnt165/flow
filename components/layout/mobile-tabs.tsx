"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, isMoreActive, MOBILE_TABS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.nav.mobileLabel}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-surface-2 bg-surface px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      {MOBILE_TABS.map((tab) => {
        const active = tab.href === "/more" ? isMoreActive(pathname) : isActive(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center gap-[5px] text-[11px] no-underline",
              active
                ? "font-semibold text-accent hover:text-accent"
                : "font-medium text-dim hover:text-text",
            )}
          >
            <Icon className="size-[22px]" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
