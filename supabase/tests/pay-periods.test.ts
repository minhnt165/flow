import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, num, setNow, type Db } from "./db";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  await setNow(db, "2026-11-01T10:00:00+07:00");
});

// Cách đếm cũ (duyệt từng tháng) làm chuẩn để so kết quả.
const REFERENCE = `
  select count(*)::int
  from generate_series(date_trunc('month', $1::date), date_trunc('month', $2::date), interval '1 month') m
  where fn_salary_date(m::date, $3) > $1::date and fn_salary_date(m::date, $3) < $2::date
`;

describe("fn_pay_periods", () => {
  it("khớp cách đếm từng tháng ở các mốc biên (ngày lương trùng from/to, tháng ngắn, ngày 31)", async () => {
    const froms = ["2026-11-01", "2026-11-05", "2026-11-06", "2027-01-31", "2027-02-28"];
    const tos = [
      "2026-11-06",
      "2026-11-07",
      "2026-12-05",
      "2027-02-28",
      "2027-03-01",
      "2028-06-30",
    ];
    for (const day of [1, 5, 6, 28, 30, 31]) {
      for (const from of froms) {
        for (const to of tos) {
          if (to <= from) continue;
          const [{ n }] = (
            await db.query<{ n: number }>("select fn_pay_periods($1, $2, $3) as n", [from, to, day])
          ).rows;
          const [{ count }] = (await db.query<{ count: number }>(REFERENCE, [from, to, day])).rows;
          expect({ from, to, day, n }).toEqual({ from, to, day, n: count });
        }
      }
    }
  });

  it("hạn trước hoặc bằng hôm nay, hoặc không có hạn → 0", async () => {
    const { rows } = await db.query<{ a: number; b: number; c: number }>(
      `select fn_pay_periods('2026-11-01', '2026-11-01', 5) as a,
              fn_pay_periods('2026-11-01', '2026-10-01', 5) as b,
              fn_pay_periods('2026-11-01', null, 5) as c`,
    );
    expect(rows[0]).toEqual({ a: 0, b: 0, c: 0 });
  });

  it("hạn gõ nhầm năm 6 chữ số không làm view tiến độ quỹ chạy quá giới hạn thời gian", async () => {
    const uid = await createUser(db, "pay-periods@example.com");
    const q = asUser(db, uid);
    await q(
      `insert into funds (name, kind, target_amount, target_date)
       values ('Gõ nhầm năm', 'goal', 5000000, '202706-01-01')`,
    );
    const t0 = Date.now();
    const [g] = await q("select periods_left from v_fund_goal_progress");
    expect(Date.now() - t0).toBeLessThan(500);
    // Đã đối chiếu với REFERENCE (ngày lương mặc định 1); chạy REFERENCE ở đây mất ~15 giây.
    expect(num(g.periods_left)).toBe(2408149);
  });
});
