import { cn } from "@/lib/utils";

// Vệt sáng mờ màu accent (hoặc màu quỹ) ở góc trang; không nhận sự kiện chuột.
export function Glow({
  className,
  color = "var(--glow-accent)",
  size = 440,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
    />
  );
}
