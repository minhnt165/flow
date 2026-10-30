"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/messages/vi";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts.at(-1)![0];
  return letters.toUpperCase();
}

export function AccountBox({ name, email }: { name: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.nav.account}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-surface-2 bg-bg p-3 text-left outline-none hover:border-border focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-border text-[13px] font-semibold text-text">
          {initials(name)}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-semibold text-text">{name}</span>
          <span className="truncate text-[11px] text-muted-foreground">{email}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem render={<Link href="/settings" className="text-text no-underline" />}>
          <Settings className="size-4" aria-hidden />
          {t.nav.settings}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="size-4" aria-hidden />
          {t.nav.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
