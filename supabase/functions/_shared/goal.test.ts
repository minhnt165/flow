import { describe, expect, it } from "vitest";
import {
  forecastScenarios,
  payPeriods,
  perPeriodNeeded,
  planGoal,
  salaryDatesBetween,
} from "./goal.ts";

describe("kỳ lương", () => {
  it("đếm kỳ lương today < d < hạn, cùng quy tắc với SQL", () => {
    expect(salaryDatesBetween("2026-10-30", "2027-02-06", 6)).toEqual([
      "2026-11-06",
      "2026-12-06",
      "2027-01-06",
    ]);
    expect(payPeriods("2027-01-15", "2027-04-01", 31)).toBe(3);
    expect(payPeriods("2026-10-30", null, 6)).toBe(0);
  });
  it("góp mỗi kỳ làm tròn lên 50.000", () => {
    expect(perPeriodNeeded(8_500_000, 3)).toBe(2_850_000);
    expect(perPeriodNeeded(40_000_000, 11)).toBe(3_650_000);
    expect(perPeriodNeeded(0, 3)).toBe(0);
  });
});

describe("planGoal (cột Kế hoạch của bạn)", () => {
  it("40 triệu hạn 01/10/2027, góp 3.650.000/kỳ, lương 22 triệu", () => {
    const plan = planGoal({
      target: 40_000_000,
      contributed: 0,
      deadline: "2027-10-01",
      today: "2026-10-30",
      salaryDay: 5,
      contribution: 3_650_000,
      salary: 22_000_000,
      otherCommitments: 6_000_000,
    });
    expect(plan.periods).toBe(11);
    expect(plan.perPeriod).toBe(3_650_000);
    expect(plan.pctOfSalary).toBe(17);
    expect(plan.leftAfterCommitments).toBe(12_350_000);
    expect(plan.reachDate).toBe("2027-09-05");
    expect(plan.onTime).toBe(true);
  });
});

describe("forecastScenarios (dự báo đến hạn)", () => {
  it("giữ đà 1 triệu/kỳ → 63%; tăng lên 2.850.000 → 100%; hạ mục tiêu 10 triệu → 95%", () => {
    const s = forecastScenarios({
      target: 15_000_000,
      contributed: 6_500_000,
      periods: 3,
      pace: 1_000_000,
      perPeriod: 2_850_000,
    });
    expect(s).toEqual([
      { kind: "keep", perPeriod: 1_000_000, projected: 9_500_000, pct: 63 },
      { kind: "increase", perPeriod: 2_850_000, projected: 15_050_000, pct: 100 },
      { kind: "lower", perPeriod: 1_000_000, target: 10_000_000, projected: 9_500_000, pct: 95 },
    ]);
  });
});
