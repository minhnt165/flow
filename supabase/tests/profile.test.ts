import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, createUser, type Db } from "./db";

let db: Db;

beforeAll(async () => {
  db = await createDb();
});

describe("hồ sơ thiếu (tài khoản tạo trước migration)", () => {
  it("ensure_profile tạo hồ sơ + dữ liệu mặc định, gọi lại không nhân đôi", async () => {
    // Mô phỏng tài khoản đăng ký trước migration: lúc đó chưa có trigger tạo hồ sơ.
    await db.exec("alter table auth.users disable trigger on_auth_user_created");
    const uid = await createUser(db, "legacy@example.com", { name: "Legacy" });
    await db.exec("alter table auth.users enable trigger on_auth_user_created");
    const q = asUser(db, uid);
    expect(await q("select id from profiles")).toEqual([]);

    const [p] = await q("select (ensure_profile()).display_name as name");
    expect(p.name).toBe("Legacy");
    expect(await q("select salary_day from profiles")).toEqual([{ salary_day: null }]);
    const [{ n: funds }] = await q<{ n: number }>("select count(*)::int as n from funds");
    const [{ n: cats }] = await q<{ n: number }>("select count(*)::int as n from categories");
    expect(funds).toBeGreaterThan(0);
    expect(cats).toBe(11);

    await q("select ensure_profile()");
    const [{ n: funds2 }] = await q<{ n: number }>("select count(*)::int as n from funds");
    const [{ n: cats2 }] = await q<{ n: number }>("select count(*)::int as n from categories");
    expect([funds2, cats2]).toEqual([funds, cats]);
  });

  it("người đã có hồ sơ: ensure_profile trả về hồ sơ hiện có, không đổi gì", async () => {
    const uid = await createUser(db, "ok@example.com", { full_name: "Minh" });
    const q = asUser(db, uid);
    await q("update profiles set salary_day = 6");
    const [p] = await q("select (ensure_profile()).salary_day as d");
    expect(p.d).toBe(6);
  });
});
