import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  color = "var(--accent)",
  track = "var(--surface-2)",
  height = 6,
  marker,
  markerLabel,
  className,
  label,
}: {
  /** 0–100 */
  value: number;
  color?: string;
  track?: string;
  height?: number;
  /** Vạch "đáng lẽ" (0–100) */
  marker?: number | null;
  markerLabel?: string;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="overflow-hidden"
        style={{ height, borderRadius: height / 2, background: track }}
      >
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color, borderRadius: height / 2 }}
        />
      </div>
      {marker != null && (
        <>
          <div
            aria-hidden
            className="absolute w-0.5 rounded-[1px] bg-text"
            style={{ left: `${Math.min(100, marker)}%`, top: -4, height: height + 8 }}
          />
          {markerLabel && (
            <span
              className="absolute -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground"
              style={{ left: `${Math.min(92, Math.max(8, marker))}%`, top: height + 8 }}
            >
              {markerLabel}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/** Thanh ngang xếp chồng (chi theo danh mục). */
export function StackedBar({
  segments,
  label,
}: {
  segments: { key: string; value: number; color: string }[];
  label: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-3.5 gap-[3px] overflow-hidden rounded-[7px]"
    >
      {total === 0 ? (
        <div className="grow bg-surface-2" />
      ) : (
        segments.map((s) => (
          <div key={s.key} style={{ width: `${(s.value * 100) / total}%`, background: s.color }} />
        ))
      )}
    </div>
  );
}
