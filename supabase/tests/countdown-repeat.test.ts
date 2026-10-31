import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, num, setNow, type Db } from "./db";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  // 30/10/2026 10:00 giờ Việt Nam
  await setNow(db, "2026-10-30T10:00:00+07:00");
});

describe("countdown lặp theo chu kỳ tháng (repeat_months)", () => {
  it("fn_shift_months giữ ngày, tháng ngắn lấy ngày cuối", async () => {
    const rows = (
      await db.query<{ a: string; b: string; c: string }>(
        `select fn_shift_months('2026-01-31', 1)::text as a,
                fn_shift_months('2026-01-31', 13)::text as b,
                fn_shift_months('2024-02-29', 12)::text as c`,
      )
    ).rows;
    expect(rows[0]).toEqual({ a: "2026-02-28", b: "2027-02-28", c: "2025-02-28" });
  });

  it("lần tới theo chu kỳ 1 / 3 / 6 / 12 tháng, vòng tiến độ tính từ lần trước", async () => {
    const uid = await createUser(db, "cd-repeat@example.com");
    const q = asUser(db, uid);
    await q(
      `insert into countdowns (title, event_date, repeat_months, created_at) values
        ('Tiền nhà', '2026-01-05', 1, '2026-01-01T00:00:00+07:00'),
        ('Cuối tháng', '2026-01-31', 1, '2026-01-01T00:00:00+07:00'),
        ('Quý', '2026-01-10', 3, '2026-01-01T00:00:00+07:00'),
        ('Nửa năm', '2026-04-30', 6, '2026-01-01T00:00:00+07:00'),
        ('Năm', '2020-03-08', 12, '2026-01-01T00:00:00+07:00'),
        ('Hôm nay', '2026-09-30', 1, '2026-01-01T00:00:00+07:00')`,
    );
    const rows = await q<{
      title: string;
      next: string;
      days_left: number;
      cycle_start: string;
      elapsed_pct: string;
      is_past: boolean;
      repeat_yearly: boolean;
    }>(
      `select title, next_occurrence::text as next, days_left, cycle_start::text, elapsed_pct, is_past, repeat_yearly
       from v_countdowns`,
    );
    const by = Object.fromEntries(rows.map((r) => [r.title, r]));
    expect(by["Tiền nhà"].next).toBe("2026-11-05");
    expect(by["Tiền nhà"].cycle_start).toBe("2026-10-05");
    expect(by["Tiền nhà"].days_left).toBe(6);
    expect(num(by["Tiền nhà"].elapsed_pct)).toBeCloseTo(80.6, 1);
    expect(by["Cuối tháng"].next).toBe("2026-10-31");
    expect(by["Quý"].next).toBe("2027-01-10");
    expect(by["Quý"].cycle_start).toBe("2026-10-10");
    expect(by["Nửa năm"].next).toBe("2026-10-30"); // 30/04 + 6 tháng = hôm nay
    expect(by["Năm"].next).toBe("2027-03-08");
    expect(by["Năm"].repeat_yearly).toBe(true);
    expect(by["Hôm nay"].next).toBe("2026-10-30");
    expect(by["Hôm nay"].days_left).toBe(0);
    expect(rows.every((r) => !r.is_past)).toBe(true);
  });

  it("cột cũ repeat_yearly: ghi true → 12 tháng, đổi repeat_months → repeat_yearly dẫn xuất theo", async () => {
    const uid = await createUser(db, "cd-legacy@example.com");
    const q = asUser(db, uid);
    const [{ id }] = await q<{ id: string }>(
      "insert into countdowns (title, event_date, repeat_yearly) values ('Cũ', '2020-01-01', true) returning id",
    );
    expect(
      await q("select repeat_months, repeat_yearly from countdowns where id = $1", [id]),
    ).toEqual([{ repeat_months: 12, repeat_yearly: true }]);
    await q("update countdowns set repeat_months = 3 where id = $1", [id]);
    expect(
      await q("select repeat_months, repeat_yearly from countdowns where id = $1", [id]),
    ).toEqual([{ repeat_months: 3, repeat_yearly: false }]);
    await q("update countdowns set repeat_months = null where id = $1", [id]);
    const [v] = await q("select is_past, repeat_months from v_countdowns where id = $1", [id]);
    expect(v).toEqual({ is_past: true, repeat_months: null });
    await expect(
      q(
        "insert into countdowns (title, event_date, repeat_months) values ('Sai', '2026-01-01', 5)",
      ),
    ).rejects.toThrow(/repeat_months/);
  });
});
