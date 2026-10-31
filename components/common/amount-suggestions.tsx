"use client";

import { Chip } from "@/components/common/segmented";
import { formatNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";
import { amountSuggestions } from "@/supabase/functions/_shared/format.ts";

/**
 * Gợi ý số tiền kiểu app ngân hàng: gõ "45" → 45.000 · 450.000 · 4.500.000.
 * Chỉ hiện khi có gợi ý; người gọi quyết định lúc nào hiện (đang gõ, ô đang focus).
 */
export function AmountSuggestions({
  value,
  onPick,
  className,
}: {
  value: number;
  onPick: (v: number) => void;
  className?: string;
}) {
  const options = amountSuggestions(value);
  if (options.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={t.common.amountSuggestions}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((v) => (
        <Chip
          key={v}
          // Giữ focus ở ô nhập khi bấm chip (không blur rồi mất gợi ý trước khi click).
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(v)}
          className="min-h-9 px-3 font-display text-[13px] font-semibold tabular-nums md:min-h-8"
        >
          {formatNumber(v)}
        </Chip>
      ))}
    </div>
  );
}
