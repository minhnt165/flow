import type { PaletteColor } from "@/lib/supabase/types";

/** Màu chọn được cho quỹ / danh mục / countdown (slate là trung tính, dành cho "Khác"). */
export const PALETTE: PaletteColor[] = [
  "sky",
  "orange",
  "green",
  "violet",
  "pink",
  "red",
  "yellow",
];
export const PALETTE_WITH_NEUTRAL: PaletteColor[] = [...PALETTE, "slate"];

/** Màu chữ/nét và nền ô icon cùng tông, dạng biến CSS (không hard-code mã màu). */
export function tone(color: PaletteColor | string | null | undefined) {
  const c = color && PALETTE_WITH_NEUTRAL.includes(color as PaletteColor) ? color : "slate";
  return { fg: `var(--cat-${c})`, bg: `var(--cat-${c}-bg)` };
}

/** Vệt sáng góc trang theo màu quỹ. */
export function glowOf(color: PaletteColor | string) {
  return `color-mix(in srgb, ${tone(color).fg} 14%, transparent)`;
}
