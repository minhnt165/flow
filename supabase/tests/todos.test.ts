import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, setNow, type Db } from "./db";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  // 30/10/2026 23:30 giờ Việt Nam = 16:30 UTC: "hôm nay" phải là 30/10, không phải 30/10 UTC lệch ngày.
  await setNow(db, "2026-10-30T23:30:00+07:00");
});

describe("việc cần làm (todos, v_todos)", () => {
  let uid: string;

  beforeAll(async () => {
    uid = await createUser(db, "todos@example.com");
  });

  it("v_todos: days_left theo giờ người dùng, null khi không hạn, âm khi quá hạn; cờ done", async () => {
    const q = asUser(db, uid);
    await q(
      `insert into todos (title, due_on) values
         ('Nộp báo cáo', '2026-10-30'),
         ('Đổi dầu xe', '2026-10-28'),
         ('Đặt vé Tết', '2026-11-06'),
         ('Đọc sách', null)`,
    );
    await q("update todos set done_at = fn_now() where title = 'Đọc sách'");
    const rows = await q<{ title: string; today: string; days_left: number | null; done: boolean }>(
      "select title, today::text as today, days_left, done from v_todos order by title",
    );
    expect(rows).toEqual([
      { title: "Nộp báo cáo", today: "2026-10-30", days_left: 0, done: false },
      { title: "Đặt vé Tết", today: "2026-10-30", days_left: 7, done: false },
      { title: "Đọc sách", today: "2026-10-30", days_left: null, done: true },
      { title: "Đổi dầu xe", today: "2026-10-30", days_left: -2, done: false },
    ]);
  });

  it("tiêu đề bắt buộc, tối đa 120 ký tự; ghi chú tối đa 1000", async () => {
    const q = asUser(db, uid);
    await expect(q("insert into todos (title) values ('   ')")).rejects.toThrow(
      /todos_title_check/,
    );
    await expect(q("insert into todos (title) values (repeat('a', 121))")).rejects.toThrow(
      /todos_title_check/,
    );
    await expect(
      q("insert into todos (title, note) values ('x', repeat('a', 1001))"),
    ).rejects.toThrow(/todos_note_check/);
  });

  it("RLS: người khác không đọc, không sửa, không chèn hộ", async () => {
    const other = await createUser(db, "todos-other@example.com");
    const q = asUser(db, other);
    expect(await q("select id from v_todos")).toEqual([]);
    const [{ n }] = await q<{ n: number }>(
      "with u as (update todos set done_at = fn_now() returning 1) select count(*)::int as n from u",
    );
    expect(n).toBe(0);
    await expect(
      q("insert into todos (user_id, title) values ($1, 'hack')", [uid]),
    ).rejects.toThrow(/row-level security/);
  });

  it("xoá tài khoản xoá luôn việc cần làm", async () => {
    const victim = await createUser(db, "todos-bye@example.com");
    const q = asUser(db, victim);
    await q("insert into todos (title) values ('tạm')");
    await q("select delete_account()");
    const [{ n }] = await asUser(db, uid)<{ n: number }>(
      "select count(*)::int as n from todos where user_id = $1",
      [victim],
    );
    expect(n).toBe(0);
  });
});
