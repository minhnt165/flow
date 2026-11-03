// Kế hoạch của một mục tiêu (không phải tiền): tuần thứ mấy, buổi dự kiến, nhanh/chậm nhịp, % hoàn thành.
// Hàm thuần, dùng chung cho giao diện và chế độ demo.
import { addDays, daysBetween } from "@/lib/dates";
import type { ObjectiveView } from "@/lib/supabase/types";

export type ObjectiveStatus = "done" | "upcoming" | "overdue" | "behind" | "on_track" | "open";

export type ObjectivePlan = {
  status: ObjectiveStatus;
  /** % hoàn thành: theo kết quả đầu ra nếu có, không thì theo số buổi so với tổng dự kiến. */
  pct: number | null;
  /** Tuần thứ mấy kể từ ngày bắt đầu (1 = tuần đầu); 0 khi chưa bắt đầu. */
  weekNo: number;
  weeksTotal: number | null;
  /** Số ngày tới hạn; âm = đã quá hạn. */
  daysLeft: number | null;
  /** % thời gian đã trôi từ ngày bắt đầu tới hạn. */
  timePct: number | null;
  /** Tổng số buổi theo kế hoạch tới hạn. */
  plannedTotal: number | null;
  /** Số buổi lẽ ra đã làm tính tới hết hôm qua. */
  expected: number | null;
  /** Buổi đã làm trừ buổi dự kiến; âm = chậm nhịp. */
  gap: number | null;
  /** Số buổi còn thiếu trong tuần này. */
  weekLeft: number | null;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Thứ Hai của tuần chứa `day` (tuần T2 → CN, giống date_trunc('week') của Postgres). */
export function mondayOf(day: string) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((dow + 6) % 7));
}

export function objectivePlan(o: ObjectiveView): ObjectivePlan {
  const today = o.today;
  const per = o.sessions_per_week;
  const started = today >= o.start_on;
  const totalDays = o.end_on ? daysBetween(o.start_on, o.end_on) + 1 : null;
  const weeksTotal = totalDays ? Math.ceil(totalDays / 7) : null;
  const sinceStart = daysBetween(o.start_on, today);
  const elapsed = clamp(sinceStart, 0, totalDays ?? Infinity);

  const weekNo = !started
    ? 0
    : weeksTotal
      ? Math.min(weeksTotal, Math.floor(sinceStart / 7) + 1)
      : Math.floor(sinceStart / 7) + 1;
  const expected = per ? Math.floor((elapsed * per) / 7) : null;
  const plannedTotal = per && totalDays ? Math.round((totalDays * per) / 7) : null;
  const gap = expected === null ? null : o.total_sessions - expected;

  const pct =
    o.outputs_total > 0
      ? Math.round((o.outputs_done * 100) / o.outputs_total)
      : plannedTotal
        ? Math.min(100, Math.round((o.total_sessions * 100) / plannedTotal))
        : null;

  const daysLeft = o.end_on ? daysBetween(today, o.end_on) : null;
  const status: ObjectiveStatus = o.completed_at
    ? "done"
    : !started
      ? "upcoming"
      : daysLeft !== null && daysLeft < 0
        ? "overdue"
        : (gap !== null && gap < 0) || o.outputs_overdue > 0
          ? "behind"
          : per || o.end_on || o.outputs_total > 0
            ? "on_track"
            : "open";

  return {
    status,
    pct,
    weekNo,
    weeksTotal,
    daysLeft,
    timePct: totalDays ? Math.round((clamp(sinceStart, 0, totalDays) * 100) / totalDays) : null,
    plannedTotal,
    expected,
    gap,
    weekLeft: per ? Math.max(0, per - o.week_count) : null,
  };
}

/** Số buổi theo từng tuần, `n` tuần gần nhất, phần tử cuối là tuần này. */
export function weekBuckets(days: string[], today: string, n = 8) {
  const thisWeek = mondayOf(today);
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(thisWeek, (i - n + 1) * 7);
    const end = addDays(start, 6);
    return { start, count: days.filter((d) => d >= start && d <= end).length };
  });
}
