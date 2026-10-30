"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMonth } from "@/hooks/use-month";
import { addMonths, formatMonth, formatMonthShort } from "@/lib/dates";
import { t } from "@/messages/vi";

export function MonthPicker() {
  const { month, current, setMonth } = useMonth();
  const months = Array.from({ length: 12 }, (_, i) => addMonths(current, -i));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.expenses.pickMonth}
        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface pr-3.5 pl-4 text-[13px] font-medium text-text outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-[42px]"
      >
        <span className="md:hidden">{formatMonthShort(month)}</span>
        <span className="hidden md:inline">{formatMonth(month)}</span>
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {months.map((m) => (
          <DropdownMenuItem key={m} onClick={() => setMonth(m)}>
            <span className="grow">{formatMonth(m)}</span>
            {m === month && <Check className="size-4 text-accent" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
