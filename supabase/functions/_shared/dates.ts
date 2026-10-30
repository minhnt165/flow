// Ngày giờ theo múi giờ người dùng (mặc định Asia/Ho_Chi_Minh). Thuần, dùng chung web + Edge Functions.

export const APP_TZ = "Asia/Ho_Chi_Minh";

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

// Tạo Intl.DateTimeFormat khá tốn: giữ một bản cho mỗi múi giờ.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string) {
  let fmt = formatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    formatters.set(tz, fmt);
  }
  return fmt;
}

function parts(date: Date, tz = APP_TZ): Parts {
  const fmt = formatterFor(tz);
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(map.weekday);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Ngày "YYYY-MM-DD" theo giờ địa phương. */
export function localDate(date: Date = new Date(), tz = APP_TZ): string {
  const p = parts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Giờ "HH:mm" theo giờ địa phương. */
export function localTime(date: Date = new Date(), tz = APP_TZ): string {
  const p = parts(date, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Ghép ngày + giờ địa phương (VN không có giờ mùa hè: +07:00) thành ISO. */
export function toIso(day: string, time: string): string {
  return new Date(`${day}T${time || "00:00"}:00+07:00`).toISOString();
}

/** Số ngày giữa hai ngày "YYYY-MM-DD" (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function addMonths(day: string, n: number): string {
  const [y, m] = day.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** "2026-10-17" → "2026-10-01" */
export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function dayParts(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "Thứ Sáu, 30/10/2026" */
export function formatLongDate(day: string): string {
  const { y, m, d, weekday } = dayParts(day);
  return `${WEEKDAYS[weekday]}, ${pad(d)}/${pad(m)}/${y}`;
}

/** "Thứ Bảy, 06/02" */
export function formatWeekdayShort(day: string): string {
  const { m, d, weekday } = dayParts(day);
  return `${WEEKDAYS[weekday]}, ${pad(d)}/${pad(m)}`;
}

/** "30/10/2026" */
export function formatDate(day: string): string {
  const { y, m, d } = dayParts(day);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** "30/10" */
export function formatDayMonth(day: string): string {
  const { m, d } = dayParts(day);
  return `${pad(d)}/${pad(m)}`;
}

/** Thời điểm giao dịch: "30/10 · 12:31" */
export function formatDateTime(iso: string, tz = APP_TZ): string {
  const p = parts(new Date(iso), tz);
  return `${pad(p.day)}/${pad(p.month)} · ${pad(p.hour)}:${pad(p.minute)}`;
}

/** "Tháng 10 · 2026" */
export function formatMonth(day: string): string {
  const { y, m } = dayParts(day);
  return `Tháng ${m} · ${y}`;
}

/** "Th10 · 2026" cho màn hẹp */
export function formatMonthShort(day: string): string {
  const { y, m } = dayParts(day);
  return `Th${m} · ${y}`;
}

/** "T10" – nhãn cột biểu đồ */
export function formatMonthTick(day: string): string {
  return `T${dayParts(day).m}`;
}
