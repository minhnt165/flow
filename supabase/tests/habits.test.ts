import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, setNow, type Db } from "./db";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  // Thứ Sáu 30/10/2026, 23:30 giờ Việt Nam (16:30 UTC): "hôm nay" vẫn là 30/10.
  await setNow(db, "2026-10-30T23:30:00+07:00");
});

describe("thói quen (habits, habit_logs, fn_toggle_habit, v_habits)", () => {
  let uid: string;
  let gym: string;

  beforeAll(async () => {
    uid = await createUser(db, "habits@example.com");
    const q = asUser(db, uid);
    [{ id: gym }] = await q<{ id: string }>(
      "insert into habits (name, icon, color, target_per_week) values ('Tập gym', 'dumbbell', 'orange', 4) returning id",
    );
  });

  const view = async () => {
    const [h] = await asUser(db, uid)<{
      done_today: boolean;
      streak: number;
      week_count: number;
      total_count: number;
      last7: boolean[];
    }>("select done_today, streak, week_count, total_count, last7 from v_habits where id = $1", [
      gym,
    ]);
    return h;
  };

  it("chưa đánh dấu: streak 0, tuần 0, last7 toàn false", async () => {
    expect(await view()).toEqual({
      done_today: false,
      streak: 0,
      week_count: 0,
      total_count: 0,
      last7: [false, false, false, false, false, false, false],
    });
  });

  it("fn_toggle_habit: bật/tắt theo ngày, mặc định hôm nay, không cho ngày tương lai", async () => {
    const q = asUser(db, uid);
    const [{ r: on }] = await q<{ r: boolean }>("select fn_toggle_habit($1) as r", [gym]);
    expect(on).toBe(true);
    await q("select fn_toggle_habit($1, '2026-10-29')", [gym]);
    await q("select fn_toggle_habit($1, '2026-10-28')", [gym]);
    expect(await view()).toEqual({
      done_today: true,
      streak: 3,
      week_count: 3,
      total_count: 3,
      last7: [false, false, false, false, true, true, true],
    });
    await expect(q("select fn_toggle_habit($1, '2026-10-31')", [gym])).rejects.toThrow(
      /future_day/,
    );
  });

  it("tắt hôm nay: chuỗi tính tới hôm qua (chưa đứt); ngày tuần trước không vào week_count", async () => {
    const q = asUser(db, uid);
    const [{ r: off }] = await q<{ r: boolean }>("select fn_toggle_habit($1) as r", [gym]);
    expect(off).toBe(false);
    // Thứ Bảy tuần trước (24/10): không thuộc tuần hiện tại (T2 26/10 → hôm nay).
    await q("select fn_toggle_habit($1, '2026-10-24')", [gym]);
    expect(await view()).toEqual({
      done_today: false,
      streak: 2,
      week_count: 2,
      total_count: 3,
      last7: [true, false, false, false, true, true, false],
    });
    // Đứt chuỗi: bỏ hôm qua → chỉ còn ngày 28 nhưng không nối tới hôm qua.
    await q("select fn_toggle_habit($1, '2026-10-29')", [gym]);
    expect((await view()).streak).toBe(0);
  });

  it("RLS: người khác không thấy, không đánh dấu hộ; không ghi thẳng vào habit_logs", async () => {
    const other = await createUser(db, "habits-other@example.com");
    const q = asUser(db, other);
    expect(await q("select id from v_habits")).toEqual([]);
    await expect(q("select fn_toggle_habit($1)", [gym])).rejects.toThrow(/habit_not_found/);
    await expect(
      asUser(db, uid)("insert into habit_logs (habit_id, day) values ($1, '2026-10-01')", [gym]),
    ).rejects.toThrow(/permission denied/);
  });

  it("xoá thói quen xoá luôn log; xoá tài khoản xoá sạch", async () => {
    const victim = await createUser(db, "habits-bye@example.com");
    const q = asUser(db, victim);
    const [{ id }] = await q<{ id: string }>(
      "insert into habits (name) values ('Đọc sách') returning id",
    );
    await q("select fn_toggle_habit($1)", [id]);
    await q("delete from habits where id = $1", [id]);
    expect(await q("select id from habit_logs")).toEqual([]);
    await q("insert into habits (name) values ('Uống nước')");
    await q("select delete_account()");
    const [{ n }] = await asUser(db, uid)<{ n: number }>(
      "select count(*)::int as n from habits where user_id = $1",
      [victim],
    );
    expect(n).toBe(0);
  });
});
