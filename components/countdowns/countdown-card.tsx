import { IconTile } from "@/components/common/icon-tile";
import { tone } from "@/lib/colors";
import { formatLongDate } from "@/lib/dates";
import type { PaletteColor } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

/** Thẻ countdown trong lưới và ở cột xem trước của hộp thoại. */
export function CountdownCard({
  title,
  date,
  daysLeft,
  repeat,
  icon,
  color,
  isPast,
  big,
  className,
}: {
  title: string;
  date: string;
  daysLeft: number;
  repeat: boolean;
  icon: string;
  color: PaletteColor;
  isPast?: boolean;
  big?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[18px]", className)}>
      <div className="flex items-center justify-between">
        <IconTile icon={icon} color={color} size={44} />
        {repeat && (
          <span className="rounded-[10px] bg-surface-2 px-2.5 py-[5px] text-[11px] font-semibold text-soft">
            {t.countdowns.yearly}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-base font-semibold">
          {title || t.countdowns.dialog.namePlaceholder}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {date ? formatLongDate(date) : "—"}
        </span>
      </div>
      <div className="mt-auto flex items-baseline gap-1.5">
        {!date ? (
          <span className="font-display text-[40px] leading-none font-bold text-dim">—</span>
        ) : isPast ? (
          <span className="text-[15px] font-semibold text-muted-foreground">
            {t.countdowns.pastAgo(Math.abs(daysLeft))}
          </span>
        ) : daysLeft === 0 ? (
          <span
            className="font-display text-[32px] leading-none font-bold"
            style={{ color: tone(color).fg }}
          >
            {t.countdowns.today}
          </span>
        ) : (
          <>
            <span
              className={cn(
                "font-display leading-none font-bold",
                big ? "text-5xl tracking-[-2px]" : "text-[40px] tracking-[-1.5px]",
              )}
              style={{ color: tone(color).fg }}
            >
              {daysLeft}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {big ? t.countdowns.daysLeft : t.countdowns.days}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
