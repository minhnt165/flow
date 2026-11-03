import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, setNow, type Db } from "./db";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  // Thứ Ba 03/11/2026, 23:30 giờ Việt Nam: "hôm nay" vẫn là 03/11, tuần bắt đầu thứ Hai 02/11.
  await setNow(db, "2026-11-03T23:30:00+07:00");
});

describe("mục tiêu (objectives, objective_outputs, fn_toggle_objective_session, v_objectives)", () => {
  let uid: string;
  let java: string;

  beforeAll(async () => {
    uid = await createUser(db, "objectives@example.com");
    const q = asUser(db, uid);
    [{ id: java }] = await q<{ id: string }>(
      "insert into objectives (title, start_on, end_on, sessions_per_week) values ('Học Java', '2026-10-19', '2026-12-31', 3) returning id",
    );
  });

  const view = async () => {
    const [o] = await asUser(db, uid)<{
      today: string;
      done_today: boolean;
      week_count: number;
      total_sessions: number;
      outputs_total: number;
      outputs_done: number;
      outputs_overdue: number;
    }>(
      "select today::text, done_today, week_count, total_sessions, outputs_total, outputs_done, outputs_overdue from v_objectives where id = $1",
      [java],
    );
    return o;
  };

  it("mới tạo: chưa có buổi, chưa có kết quả đầu ra; mặc định icon target", async () => {
    expect(await view()).toEqual({
      today: "2026-11-03",
      done_today: false,
      week_count: 0,
      total_sessions: 0,
      outputs_total: 0,
      outputs_done: 0,
      outputs_overdue: 0,
    });
    const [{ icon }] = await asUser(db, uid)<{ icon: string }>(
      "select icon from objectives where id = $1",
      [java],
    );
    expect(icon).toBe("target");
  });

  it("hạn phải sau ngày bắt đầu; số buổi 1–7", async () => {
    const q = asUser(db, uid);
    await expect(
      q(
        "insert into objectives (title, start_on, end_on) values ('X', '2026-11-10', '2026-11-01')",
      ),
    ).rejects.toThrow(/check/);
    await expect(
      q(
        "insert into objectives (title, start_on, sessions_per_week) values ('X', '2026-11-01', 8)",
      ),
    ).rejects.toThrow(/check/);
  });

  it("fn_toggle_objective_session: bật/tắt theo ngày, tuần tính từ thứ Hai, không cho ngày tương lai", async () => {
    const q = asUser(db, uid);
    const [{ r: on }] = await q<{ r: boolean }>("select fn_toggle_objective_session($1) as r", [
      java,
    ]);
    expect(on).toBe(true);
    await q("select fn_toggle_objective_session($1, '2026-11-02')", [java]);
    // Chủ nhật tuần trước: tính vào tổng nhưng không vào tuần này.
    await q("select fn_toggle_objective_session($1, '2026-11-01')", [java]);
    expect(await view()).toMatchObject({ done_today: true, week_count: 2, total_sessions: 3 });

    const [{ r: off }] = await q<{ r: boolean }>("select fn_toggle_objective_session($1) as r", [
      java,
    ]);
    expect(off).toBe(false);
    expect(await view()).toMatchObject({ done_today: false, week_count: 1, total_sessions: 2 });
    await expect(q("select fn_toggle_objective_session($1, '2026-11-04')", [java])).rejects.toThrow(
      /future_day/,
    );
  });

  it("kết quả đầu ra: đếm đã xong và quá hạn (chưa xong, hạn trước hôm nay)", async () => {
    const q = asUser(db, uid);
    await q(
      `insert into objective_outputs (objective_id, title, due_on, done_at) values
        ($1, 'Cài JDK, viết Hello World', '2026-10-25', now()),
        ($1, 'Xong khoá OOP', '2026-11-01', null),
        ($1, 'Project CRUD Spring Boot', '2026-12-31', null)`,
      [java],
    );
    expect(await view()).toMatchObject({ outputs_total: 3, outputs_done: 1, outputs_overdue: 1 });
  });

  it("RLS: người khác không thấy, không tick hộ, không gắn kết quả vào mục tiêu của người khác", async () => {
    const other = await createUser(db, "objectives-other@example.com");
    const q = asUser(db, other);
    expect(await q("select id from v_objectives")).toEqual([]);
    expect(await q("select id from objective_outputs")).toEqual([]);
    await expect(q("select fn_toggle_objective_session($1)", [java])).rejects.toThrow(
      /objective_not_found/,
    );
    await expect(
      q("insert into objective_outputs (objective_id, title) values ($1, 'Chen ngang')", [java]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, uid)(
        "insert into objective_sessions (objective_id, day) values ($1, '2026-10-20')",
        [java],
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("xoá mục tiêu xoá luôn buổi và kết quả đầu ra", async () => {
    const q = asUser(db, uid);
    await q("delete from objectives where id = $1", [java]);
    expect(await q("select id from objective_sessions")).toEqual([]);
    expect(await q("select id from objective_outputs")).toEqual([]);
  });
});
