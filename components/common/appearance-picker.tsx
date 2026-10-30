"use client";

import { Check } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PALETTE, tone } from "@/lib/colors";
import { ICON_KEYS, iconFor } from "@/lib/icons";
import type { PaletteColor } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

const PICKABLE = ICON_KEYS.filter((k) => k !== "arrow-left-right");

// Nút ô icon mở bảng chọn biểu tượng + màu.
export function AppearancePicker({
  icon,
  color,
  onChange,
  label,
  iconLabel,
  colorLabel,
  showColors = true,
}: {
  icon: string;
  color: PaletteColor;
  onChange: (v: { icon?: string; color?: PaletteColor }) => void;
  label: string;
  iconLabel: string;
  colorLabel: string;
  showColors?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ background: tone(color).bg, color: tone(color).fg }}
      >
        {(() => {
          const Icon = iconFor(icon);
          return <Icon className="size-5" aria-hidden />;
        })()}
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-[300px] flex-col gap-4 p-4">
        {showColors && (
          <div className="flex flex-col gap-2">
            <span className="label-caps">{colorLabel}</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={colorLabel}>
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c === color}
                  aria-label={t.colors[c]}
                  onClick={() => onChange({ color: c })}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full border-2"
                  style={{
                    background: tone(c).fg,
                    borderColor: c === color ? "var(--text)" : "transparent",
                  }}
                >
                  {c === color && <Check className="size-4 text-bg" aria-hidden />}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="label-caps">{iconLabel}</span>
          <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={iconLabel}>
            {PICKABLE.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={k === icon}
                aria-label={k}
                onClick={() => onChange({ icon: k })}
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-xl border-2 bg-transparent p-0.5",
                  k === icon ? "border-text" : "border-transparent",
                )}
              >
                <IconTile icon={k} color={color} size={36} />
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
