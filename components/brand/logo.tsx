import { cn } from "@/lib/utils";
import { t } from "@/messages/vi";

// Mark của Flow: ô vuông bo 25% màu accent, đường nhịp đập màu nền.
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      role="img"
      aria-label={t.app.name}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <polyline
        points="12,36 22,36 28,22 36,46 42,32 52,32"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="font-display text-lg font-bold tracking-[-0.3px] text-text">
        {t.app.name}
      </span>
    </span>
  );
}
