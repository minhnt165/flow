import { describe, expect, it } from "vitest";
import { mondayOf, objectivePlan, weekBuckets } from "./objectives";
import type { ObjectiveView } from "./supabase/types";

// Hôm nay: thứ Ba 03/11/2026.
const base: ObjectiveView = {
  id: "o1",
  user_id: "u1",
  title: "Học Java",
  why: null,
  icon: "target",
  color: "violet",
  start_on: "2026-10-19",
  end_on: "2026-12-27",
  sessions_per_week: 3,
  completed_at: null,
  sort_order: 0,
  created_at: "2026-10-19T00:00:00Z",
  today: "2026-11-03",
  done_today: false,
  week_count: 1,
  total_sessions: 6,
  outputs_total: 0,
  outputs_done: 0,
  outputs_overdue: 0,
};

describe("objectivePlan", () => {
  it("tuần thứ mấy, tổng tuần, buổi dự kiến tới hết hôm qua", () => {
    const p = objectivePlan(base);
    // 19/10 → 27/12 = 70 ngày = 10 tuần; hôm nay ngày thứ 16 → tuần 3.
    expect(p.weeksTotal).toBe(10);
    expect(p.weekNo).toBe(3);
    expect(p.plannedTotal).toBe(30);
    // 15 ngày đã qua × 3/7 = 6,4 → 6 buổi.
    expect(p.expected).toBe(6);
    expect(p.gap).toBe(0);
    expect(p.weekLeft).toBe(2);
    expect(p.daysLeft).toBe(54);
    expect(p.timePct).toBe(21);
    expect(p.status).toBe("on_track");
    // Chưa có kết quả đầu ra: % theo buổi (6/30).
    expect(p.pct).toBe(20);
  });

  it("chậm nhịp khi thiếu buổi hoặc có kết quả quá hạn", () => {
    expect(objectivePlan({ ...base, total_sessions: 4 })).toMatchObject({
      gap: -2,
      status: "behind",
    });
    expect(objectivePlan({ ...base, outputs_total: 2, outputs_overdue: 1 }).status).toBe("behind");
  });

  it("% theo kết quả đầu ra khi có", () => {
    expect(objectivePlan({ ...base, outputs_total: 4, outputs_done: 1 }).pct).toBe(25);
  });

  it("chưa bắt đầu, quá hạn, đã hoàn thành", () => {
    expect(objectivePlan({ ...base, start_on: "2026-11-10" })).toMatchObject({
      status: "upcoming",
      weekNo: 0,
      expected: 0,
      timePct: 0,
    });
    const late = objectivePlan({ ...base, end_on: "2026-11-01" });
    expect(late.status).toBe("overdue");
    expect(late.weekNo).toBe(2);
    expect(late.timePct).toBe(100);
    expect(objectivePlan({ ...base, completed_at: "2026-11-02T10:00:00Z" }).status).toBe("done");
  });

  it("không hạn, không nhịp, không kết quả: mở, không có số liệu kế hoạch", () => {
    const p = objectivePlan({ ...base, end_on: null, sessions_per_week: null });
    expect(p).toMatchObject({
      status: "open",
      pct: null,
      weeksTotal: null,
      plannedTotal: null,
      expected: null,
      gap: null,
      weekLeft: null,
      weekNo: 3,
    });
  });
});

describe("weekBuckets / mondayOf", () => {
  it("tuần T2 → CN, phần tử cuối là tuần này", () => {
    expect(mondayOf("2026-11-03")).toBe("2026-11-02");
    expect(mondayOf("2026-11-08")).toBe("2026-11-02");
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    const b = weekBuckets(
      ["2026-11-03", "2026-11-01", "2026-10-26", "2026-10-20"],
      "2026-11-03",
      3,
    );
    expect(b).toEqual([
      { start: "2026-10-19", count: 1 },
      { start: "2026-10-26", count: 2 },
      { start: "2026-11-02", count: 1 },
    ]);
  });
});
