import {
  Activity,
  CreditCard,
  FileText,
  House,
  LayoutGrid,
  Settings,
  SquareCheckBig,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/messages/vi";

export type NavItem = { href: string; label: string; icon: LucideIcon; soon?: boolean };

export const MODULES: NavItem[] = [
  { href: "/", label: t.nav.home, icon: House },
  { href: "/expenses", label: t.nav.expenses, icon: CreditCard },
  { href: "/countdowns", label: t.nav.countdowns, icon: Timer },
  { href: "/todos", label: t.nav.todos, icon: SquareCheckBig, soon: true },
  { href: "/habits", label: t.nav.habits, icon: Activity, soon: true },
  { href: "/notes", label: t.nav.notes, icon: FileText, soon: true },
  { href: "/bills", label: t.nav.bills, icon: Zap },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: t.nav.settings, icon: Settings };

export const MOBILE_TABS: NavItem[] = [
  MODULES[0],
  MODULES[1],
  MODULES[2],
  { href: "/more", label: t.nav.more, icon: LayoutGrid },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Tab "Khác" sáng khi đang ở module không có tab riêng. */
export function isMoreActive(pathname: string) {
  return !MOBILE_TABS.slice(0, 3).some((tab) => isActive(pathname, tab.href));
}
