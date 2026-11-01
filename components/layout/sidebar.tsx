"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { AccountBox } from "@/components/layout/account-box";
import { useProfile } from "@/hooks/use-profile";
import { isActive, MODULES, SETTINGS_ITEM, type NavItem } from "@/lib/nav";
import { accountName } from "@/lib/supabase/profiles";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm no-underline transition-colors",
        active
          ? "bg-surface-2 font-semibold text-text hover:text-text"
          : "font-medium text-muted-foreground hover:bg-surface-2/60 hover:text-text",
      )}
    >
      <Icon className={cn("size-5", active && "text-accent")} aria-hidden />
      <span className="grow">{item.label}</span>
    </Link>
  );
}

export function Sidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  // Tên từ server chỉ dùng tới khi query hồ sơ tải xong; sửa tên ở Cài đặt cập nhật query này ngay.
  const profile = useProfile();
  const shownName = profile.data ? accountName(profile.data.display_name, email) : name;
  return (
    <nav
      aria-label={t.nav.label}
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-7 border-r border-surface-2 bg-surface px-4 py-7 md:flex"
    >
      <Link href="/" className="px-2 no-underline">
        <Logo />
      </Link>
      <div className="flex flex-col gap-1">
        {MODULES.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <NavLink item={SETTINGS_ITEM} pathname={pathname} />
        <AccountBox name={shownName} email={email} />
      </div>
    </nav>
  );
}
