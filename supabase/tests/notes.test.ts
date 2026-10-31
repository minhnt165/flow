import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, setNow, type Db } from "./db";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  await setNow(db, "2026-10-30T10:00:00+07:00");
});

describe("ghi chú (notes)", () => {
  let uid: string;

  beforeAll(async () => {
    uid = await createUser(db, "notes@example.com");
  });

  it("tiêu đề hoặc nội dung phải có; giới hạn độ dài", async () => {
    const q = asUser(db, uid);
    await expect(q("insert into notes default values")).rejects.toThrow(/notes_not_empty/);
    await expect(q("insert into notes (title, body) values ('  ', '  ')")).rejects.toThrow(
      /notes_not_empty/,
    );
    await expect(q("insert into notes (title) values (repeat('a', 121))")).rejects.toThrow(
      /notes_title_check/,
    );
    await q("insert into notes (body) values ('Chỉ có nội dung')");
    await q("insert into notes (title) values ('Chỉ có tiêu đề')");
    const rows = await q<{ title: string; body: string; pinned: boolean }>(
      "select title, body, pinned from notes order by created_at",
    );
    expect(rows).toEqual([
      { title: "", body: "Chỉ có nội dung", pinned: false },
      { title: "Chỉ có tiêu đề", body: "", pinned: false },
    ]);
  });

  it("updated_at chỉ đổi khi sửa nội dung / tiêu đề / ghim", async () => {
    const q = asUser(db, uid);
    const [{ id }] = await q<{ id: string }>(
      "insert into notes (title, body) values ('Danh sách mua', 'Sữa, trứng') returning id",
    );
    const at = async () =>
      (await q<{ u: string }>("select updated_at::text as u from notes where id = $1", [id]))[0].u;
    const t0 = await at();

    await setNow(db, "2026-10-30T11:00:00+07:00");
    await q("update notes set title = title where id = $1", [id]);
    expect(await at()).toBe(t0);

    await q("update notes set body = 'Sữa, trứng, bánh mì' where id = $1", [id]);
    const t1 = await at();
    expect(t1).not.toBe(t0);

    await setNow(db, "2026-10-30T12:00:00+07:00");
    await q("update notes set pinned = true where id = $1", [id]);
    expect(await at()).not.toBe(t1);
  });

  it("RLS: người khác không đọc, không sửa; xoá tài khoản xoá sạch", async () => {
    const other = await createUser(db, "notes-other@example.com");
    const q = asUser(db, other);
    expect(await q("select id from notes")).toEqual([]);
    const [{ n }] = await q<{ n: number }>(
      "with u as (update notes set pinned = true returning 1) select count(*)::int as n from u",
    );
    expect(n).toBe(0);
    await q("insert into notes (title) values ('tạm')");
    await q("select delete_account()");
    const [{ m }] = await asUser(db, uid)<{ m: number }>(
      "select count(*)::int as m from notes where user_id = $1",
      [other],
    );
    expect(m).toBe(0);
  });
});
