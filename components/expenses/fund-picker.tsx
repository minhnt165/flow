"use client";

import { ChevronDown } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatVND } from "@/lib/money";
import type { FundWithBalance } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

/** Thẻ chọn quỹ (hộp thoại chuyển quỹ): nhãn, tên, số dư. */
export function FundCardPicker({
  label,
  funds,
  value,
  onChange,
  highlight,
}: {
  label: string;
  funds: FundWithBalance[];
  value: string | undefined;
  onChange: (id: string) => void;
  highlight?: boolean;
}) {
  const fund = funds.find((f) => f.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          "flex min-w-0 flex-[1_1_200px] cursor-pointer items-center gap-3 rounded-[18px] border-[1.5px] bg-bg px-4 py-3.5 text-left text-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          highlight ? "border-accent" : "border-border",
        )}
      >
        {fund ? (
          <IconTile icon={fund.icon} color={fund.color} size={40} />
        ) : (
          <span className="size-10" />
        )}
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="text-[11px] font-semibold tracking-[1px] text-muted-foreground uppercase">
            {label}
          </span>
          <span className="truncate text-[15px] font-semibold">{fund?.name ?? "—"}</span>
          {fund && (
            <span className="text-xs text-muted-foreground">
              {t.tx.balance(formatVND(fund.balance))}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        {funds.map((f) => (
          <DropdownMenuItem key={f.id} onClick={() => onChange(f.id)}>
            <IconTile icon={f.icon} color={f.color} size={30} />
            <span className="flex min-w-0 grow flex-col">
              <span className="truncate font-medium">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatVND(f.balance)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Ô chọn quỹ gọn (select gốc) cho chi tiêu / thu nhập: "Sinh hoạt · 3.550.000 ₫". */
export function FundSelect({
  id,
  funds,
  value,
  onChange,
}: {
  id: string;
  funds: FundWithBalance[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full cursor-pointer appearance-none rounded-[14px] border border-border bg-bg pr-10 pl-3.5 text-sm text-text outline-none focus-visible:border-accent/60"
      >
        {funds.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} · {formatVND(f.balance)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
