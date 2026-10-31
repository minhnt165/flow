import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysBetween,
  formatDateTime,
  formatLongDate,
  formatMonth,
  formatWeekdayShort,
  localDate,
  localTime,
  nextOccurrenceOn,
  prevOccurrenceOn,
  shiftMonths,
  toIso,
} from "./dates.ts";

describe("ngày giờ theo giờ Việt Nam", () => {
  it("đổi UTC sang ngày/giờ địa phương", () => {
    const d = new Date("2026-10-30T17:30:00Z"); // 00:30 ngày 31/10 ở VN
    expect(localDate(d)).toBe("2026-10-31");
    expect(localTime(d)).toBe("00:30");
    expect(formatDateTime("2026-10-30T05:31:00Z")).toBe("30/10 · 12:31");
  });
  it("ghép ngày + giờ địa phương thành ISO", () => {
    expect(toIso("2026-10-30", "12:31")).toBe("2026-10-30T05:31:00.000Z");
  });
  it("định dạng tiếng Việt", () => {
    expect(formatLongDate("2026-10-30")).toBe("Thứ Sáu, 30/10/2026");
    expect(formatWeekdayShort("2027-02-06")).toBe("Thứ Bảy, 06/02");
    expect(formatMonth("2026-10-01")).toBe("Tháng 10 · 2026");
  });
  it("lặp theo chu kỳ tháng: lần tới và lần trước, tháng ngắn lấy ngày cuối", () => {
    expect(shiftMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonths("2024-02-29", 12)).toBe("2025-02-28");
    expect(nextOccurrenceOn("2026-01-05", 1, "2026-10-30")).toBe("2026-11-05");
    expect(nextOccurrenceOn("2026-01-31", 1, "2026-10-30")).toBe("2026-10-31");
    expect(nextOccurrenceOn("2026-01-10", 3, "2026-10-30")).toBe("2027-01-10");
    expect(nextOccurrenceOn("2020-03-08", 12, "2026-10-30")).toBe("2027-03-08");
    expect(nextOccurrenceOn("2026-09-30", 1, "2026-10-30")).toBe("2026-10-30");
    expect(nextOccurrenceOn("2027-02-06", null, "2026-10-30")).toBe("2027-02-06");
    expect(nextOccurrenceOn("2026-10-01", null, "2026-10-30")).toBe("2026-10-01");
    expect(prevOccurrenceOn("2026-01-10", 3, "2027-01-10")).toBe("2026-10-10");
    expect(prevOccurrenceOn("2026-01-10", 3, "2026-01-10")).toBeNull();
  });
  it("cộng tháng, đếm ngày", () => {
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-10-30", "2027-02-06")).toBe(99);
  });
});
