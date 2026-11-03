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

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const MODULES: NavItem[] = [
  { href: "/", label: t.nav.home, icon: House },
  { href: "/expenses", label: t.nav.expenses, icon: CreditCard },
  { href: "/countdowns", label: t.nav.countdowns, icon: Timer },
  { href: "/todos", label: t.nav.todos, icon: SquareCheckBig },
  { href: "/habits", label: t.nav.habits, icon: Activity },
  { href: "/notes", label: t.nav.notes, icon: FileText },
  { href: "/bills", label: t.nav.bills, icon: Zap },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: t.nav.settings, icon: Settings };

/** Module có tab riêng trên điện thoại; còn lại nằm trong tab "Khác". */
const TAB_MODULES: NavItem[] = [
  MODULES[0],
  MODULES[1],
  MODULES[2],
  { ...MODULES[6], label: t.nav.billsShort },
];

export const MORE_MODULES = MODULES.filter((m) => !TAB_MODULES.some((tab) => tab.href === m.href));

export const MOBILE_TABS: NavItem[] = [
  ...TAB_MODULES,
  { href: "/more", label: t.nav.more, icon: LayoutGrid },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Tab "Khác" sáng khi đang ở module không có tab riêng. */
export function isMoreActive(pathname: string) {
  return !TAB_MODULES.some((tab) => isActive(pathname, tab.href));
}
