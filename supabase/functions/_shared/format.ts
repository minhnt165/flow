// Định dạng tiền và số, dùng chung cho web (Next.js) và Edge Functions (Deno). Không import gì ngoài chuẩn.

const groupFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** 8450000 → "8.450.000" */
export function formatNumber(n: number): string {
  return groupFormatter.format(Math.round(n));
}

/** 8450000 → "8.450.000 ₫" (không số lẻ) */
export function formatVND(n: number): string {
  return `${formatNumber(n)} ₫`;
}

/** Số có dấu cho bảng giao dịch: −65.000 / +22.000.000 (dấu trừ Unicode). */
export function formatSigned(n: number, sign: "+" | "-" | ""): string {
  const s = sign === "-" ? "−" : sign;
  return `${s}${formatNumber(Math.abs(n))}`;
}

/** Dạng gọn cho màn hẹp: 3200000 → "3.2tr", 65000 → "65k", 1750000 → "1.75tr". */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  const trim = (x: number) => String(Number(x.toFixed(2)));
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}tr`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}k`;
  return `${sign}${abs}`;
}

/** "12 triệu", "15 triệu", "1,5 triệu", "500 nghìn" – dùng trong câu chữ. */
export function formatMillions(n: number): string {
  const abs = Math.abs(n);
  const fmt = (x: number) => String(Number(x.toFixed(2))).replace(".", ",");
  if (abs >= 1_000_000_000) return `${fmt(abs / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${fmt(abs / 1_000_000)} triệu`;
  if (abs >= 1_000) return `${fmt(abs / 1_000)} nghìn`;
  return formatVND(abs);
}

/** Bỏ mọi ký tự không phải số: "8.450.000 ₫" → 8450000. Rỗng → 0. */
export function parseAmountInput(raw: string): number {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return 0;
  return Number(digits.slice(0, 14));
}

/** Định dạng trong lúc gõ: "8450000" → "8.450.000"; rỗng giữ rỗng. */
export function formatAmountInput(raw: string): string {
  const n = parseAmountInput(raw);
  return raw.replace(/\D/g, "") === "" ? "" : formatNumber(n);
}

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALES = ["", "nghìn", "triệu", "tỷ"];

function readTriple(n: number, full: boolean): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;
  const out: string[] = [];

  if (full || hundreds > 0) out.push(DIGITS[hundreds], "trăm");

  if (tens === 0) {
    if (units > 0 && (full || hundreds > 0)) out.push("linh");
  } else if (tens === 1) {
    out.push("mười");
  } else {
    out.push(DIGITS[tens], "mươi");
  }

  if (units > 0) {
    if (units === 1 && tens >= 2) out.push("mốt");
    else if (units === 5 && tens >= 1) out.push("lăm");
    else if (units === 4 && tens >= 2) out.push("tư");
    else out.push(DIGITS[units]);
  }
  return out.join(" ");
}

/** Đọc số < 1 tỷ theo nhóm triệu / nghìn / đơn vị. */
function readBelowBillion(n: number, hasHigher: boolean): string {
  const groups = [Math.floor(n / 1_000_000), Math.floor((n % 1_000_000) / 1000), n % 1000];
  const parts: string[] = [];
  groups.forEach((g, i) => {
    if (g === 0) return;
    parts.push(readTriple(g, hasHigher || parts.length > 0));
    const scale = SCALES[2 - i];
    if (scale) parts.push(scale);
  });
  return parts.join(" ");
}

/** Đọc số tiền thành chữ: 8450000 → "Tám triệu bốn trăm năm mươi nghìn đồng". */
export function readVND(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return "Không đồng";
  const billions = Math.floor(value / 1_000_000_000);
  const rest = value % 1_000_000_000;
  const parts: string[] = [];
  if (billions > 0) parts.push(readBelowBillion(billions, false), SCALES[3]);
  if (rest > 0) parts.push(readBelowBillion(rest, billions > 0));
  const text = `${parts.join(" ")} đồng`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
