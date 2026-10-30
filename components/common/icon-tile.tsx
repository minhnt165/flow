import { tone } from "@/lib/colors";
import { iconFor } from "@/lib/icons";
import { cn } from "@/lib/utils";

// Icon đặt trong ô nền tối cùng tông với màu danh mục / quỹ.
export function IconTile({
  icon,
  color,
  size = 40,
  className,
}: {
  icon: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const Icon = iconFor(icon);
  const t = tone(color);
  const radius = size >= 40 ? 14 : size >= 34 ? 11 : 9;
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size, borderRadius: radius, background: t.bg, color: t.fg }}
    >
      <Icon style={{ width: Math.round(size * 0.45), height: Math.round(size * 0.45) }} />
    </span>
  );
}
