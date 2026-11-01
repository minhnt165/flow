import { beforeAll, describe, expect, it } from "vitest";
import { asService, asUser, createDb, createUser, num, setNow, type Db } from "./db";

let db: Db;

async function ids(uid: string) {
  const q = asUser(db, uid);
  const [fund] = await q<{ id: string }>("select id from funds where is_default");
  const cats = await q<{ id: string; name: string; type: string }>(
    "select id, name, type from categories",
  );
  const cat = (name: string, type = "expense") =>
    cats.find((c) => c.name === name && c.type === type)!.id;
  return { q, defaultFund: fund.id, cat };
}

beforeAll(async () => {
  db = await createDb();
  // 30/10/2026 10:00 giờ Việt Nam
  await setNow(db, "2026-10-30T10:00:00+07:00");
});

describe("người dùng mới", () => {
  it("tạo profile, seed 8 danh mục chi + 3 thu và 3 quỹ (Sinh hoạt mặc định)", async () => {
    const uid = await createUser(db, "minh@example.com", { full_name: "Minh" });
    const q = asUser(db, uid);
    const [profile] = await q("select display_name, timezone, daily_summary_at from profiles");
    expect(profile).toMatchObject({
      display_name: "Minh",
      timezone: "Asia/Ho_Chi_Minh",
      daily_summary_at: "21:00:00",
    });
    const cats = await q<{ type: string; n: number }>(
      "select type, count(*)::int as n from categories group by type order by type",
    );
    expect(cats).toEqual([
      { type: "expense", n: 8 },
      { type: "income", n: 3 },
    ]);
    const funds = await q("select name, kind, is_default from funds order by sort_order");
    expect(funds).toEqual([
      { name: "Sinh hoạt", kind: "monthly_budget", is_default: true },
      { name: "Tiết kiệm", kind: "free", is_default: false },
      { name: "Quỹ khẩn cấp", kind: "free", is_default: false },
    ]);
  });
});

describe("giao dịch và số dư quỹ", () => {
  let uid: string;
  let tet: string;

  beforeAll(async () => {
    uid = await createUser(db, "balance@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    [{ id: tet }] = await q<{ id: string }>(
      "insert into funds (name, kind) values ('Quỹ Tết', 'free') returning id",
    );
    await q(
      `insert into transactions (type, amount, fund_id, category_id, note) values
        ('income', 22000000, $1, $2, 'Lương tháng 10'),
        ('expense', 65000, $1, $3, 'Cơm trưa')`,
      [defaultFund, cat("Lương", "income"), cat("Ăn uống")],
    );
  });

  it("v_fund_balances = thu + chuyển đến − chi − chuyển đi; chuyển quỹ không đổi tổng", async () => {
    const { q, defaultFund } = await ids(uid);
    const total = async () =>
      num((await q<{ s: string }>("select sum(balance) as s from v_fund_balances"))[0].s);
    const before = await total();
    await q(
      "insert into transactions (type, amount, fund_id, to_fund_id) values ('transfer', 1000000, $1, $2)",
      [defaultFund, tet],
    );
    const rows = await q<{ name: string; balance: string }>(
      "select name, balance from v_fund_balances where id in ($1, $2) order by name",
      [defaultFund, tet],
    );
    expect(rows.map((r) => [r.name, num(r.balance)])).toEqual([
      ["Quỹ Tết", 1000000],
      ["Sinh hoạt", 20935000],
    ]);
    expect(await total()).toBe(before);
  });

  it("opening_balance cộng vào số dư và tiến độ mục tiêu, không phải là giao dịch", async () => {
    const { q, cat } = await ids(uid);
    const [{ id: cash }] = await q<{ id: string }>(
      "insert into funds (name, kind, opening_balance) values ('Ví tiền mặt', 'free', 2000000) returning id",
    );
    const bal = async () =>
      num(
        (
          await q<{ balance: string }>("select balance from v_fund_balances where id = $1", [cash])
        )[0].balance,
      );
    expect(await bal()).toBe(2000000);
    await q(
      "insert into transactions (type, amount, fund_id, category_id) values ('expense', 500000, $1, $2)",
      [cash, cat("Ăn uống")],
    );
    expect(await bal()).toBe(1500000);
    const [n] = await q<{ n: number }>(
      "select count(*)::int as n from transactions where fund_id = $1",
      [cash],
    );
    expect(n.n).toBe(1);

    const [{ id: goal }] = await q<{ id: string }>(
      "insert into funds (name, kind, target_amount, opening_balance) values ('Đã có sẵn', 'goal', 10000000, 4000000) returning id",
    );
    const [p] = await q<{ contributed: string; pct: string }>(
      "select contributed, pct from v_fund_goal_progress where fund_id = $1",
      [goal],
    );
    expect([num(p.contributed), num(p.pct)]).toEqual([4000000, 40]);

    await expect(
      q("insert into funds (name, kind, opening_balance) values ('Âm', 'free', -1)"),
    ).rejects.toThrow(/opening_balance/);
  });

  it("ràng buộc: chuyển quỹ cần quỹ đến; chi/thu cần danh mục đúng loại", async () => {
    const { q, defaultFund, cat } = await ids(uid);
    await expect(
      q("insert into transactions (type, amount, fund_id) values ('transfer', 1000, $1)", [
        defaultFund,
      ]),
    ).rejects.toThrow(/transactions_shape/);
    await expect(
      q("insert into transactions (type, amount, fund_id) values ('expense', 1000, $1)", [
        defaultFund,
      ]),
    ).rejects.toThrow(/transactions_shape/);
    await expect(
      q(
        "insert into transactions (type, amount, fund_id, category_id) values ('expense', 1000, $1, $2)",
        [defaultFund, cat("Lương", "income")],
      ),
    ).rejects.toThrow(/category_type_mismatch/);
    await expect(
      q(
        "insert into transactions (type, amount, fund_id, category_id) values ('expense', 0, $1, $2)",
        [defaultFund, cat("Ăn uống")],
      ),
    ).rejects.toThrow(/amount_check/);
  });

  it("RLS: người khác không đọc được và không ghi vào quỹ của mình", async () => {
    const other = await createUser(db, "other@example.com");
    const { q: qo, cat } = await ids(other);
    expect(await qo("select * from funds where id = $1", [tet])).toEqual([]);
    expect(await qo("select * from v_fund_balances where id = $1", [tet])).toEqual([]);
    await expect(
      qo(
        "insert into transactions (type, amount, fund_id, category_id) values ('expense', 1000, $1, $2)",
        [tet, cat("Ăn uống")],
      ),
    ).rejects.toThrow(/fund_not_found/);
    await expect(
      qo("insert into funds (user_id, name) values ($1, 'Hack')", [uid]),
    ).rejects.toThrow(/row-level security/);
  });

  it("quỹ mặc định không xoá được", async () => {
    const { q, defaultFund } = await ids(uid);
    await expect(q("delete from funds where id = $1", [defaultFund])).rejects.toThrow(
      /default_fund_protected/,
    );
  });
});

describe("ngân sách tháng (v_fund_month)", () => {
  it("tính đã chi trong tháng theo giờ Việt Nam, phần còn lại và số ngày còn lại", async () => {
    const uid = await createUser(db, "budget@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    await q("update funds set monthly_budget = 12000000 where id = $1", [defaultFund]);
    await q(
      `insert into transactions (type, amount, fund_id, category_id, occurred_at) values
        ('expense', 8000000, $1, $2, '2026-10-05T12:00:00+07:00'),
        ('expense', 450000, $1, $2, '2026-10-31T23:30:00+07:00'),
        ('expense', 999000, $1, $2, '2026-11-01T00:10:00+07:00'),
        ('expense', 777000, $1, $2, '2026-09-30T23:59:00+07:00')`,
      [defaultFund, cat("Ăn uống")],
    );
    const [m] = await q(
      "select spent, remaining, pct_used, days_left, month_start from v_fund_month",
    );
    expect(num(m.spent)).toBe(8450000);
    expect(num(m.remaining)).toBe(3550000);
    expect(num(m.pct_used)).toBeCloseTo(70.4, 1);
    expect(m.days_left).toBe(2);

    const [nov] = await q("select spent from fn_budget_month('2026-11-15')");
    expect(num(nov.spent)).toBe(999000);
  });

  it("fn_month_summary: tổng chi/thu và chi theo danh mục giảm dần", async () => {
    const uid = await createUser(db, "summary@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    await q(
      `insert into transactions (type, amount, fund_id, category_id, occurred_at) values
        ('expense', 3200000, $1, $2, '2026-10-02T08:00:00+07:00'),
        ('expense', 2400000, $1, $3, '2026-10-03T08:00:00+07:00'),
        ('expense', 1750000, $1, $4, '2026-10-04T08:00:00+07:00'),
        ('income', 22000000, $1, $5, '2026-10-05T08:00:00+07:00')`,
      [defaultFund, cat("Ăn uống"), cat("Mua sắm"), cat("Hoá đơn"), cat("Lương", "income")],
    );
    const [{ s }] = await q<{ s: Record<string, unknown> }>(
      "select fn_month_summary($1, '2026-10-01') as s",
      [uid],
    );
    expect(num(s.total_expense)).toBe(7350000);
    expect(num(s.total_income)).toBe(22000000);
    const byCat = s.by_category as { name: string; amount: number }[];
    expect(byCat.map((c) => c.name)).toEqual(["Ăn uống", "Mua sắm", "Hoá đơn"]);
  });

  it("fn_monthly_totals: n tháng liên tiếp kết thúc tại tháng xem, tháng trống = 0, ranh giới theo giờ VN", async () => {
    const uid = await createUser(db, "monthly@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    await q(
      `insert into transactions (type, amount, fund_id, category_id, occurred_at) values
        ('expense', 500000, $1, $2, '2026-08-15T08:00:00+07:00'),
        ('expense', 300000, $1, $2, '2026-09-30T23:30:00+07:00'),
        ('expense', 700000, $1, $2, '2026-10-01T00:10:00+07:00'),
        ('income', 9000000, $1, $3, '2026-10-05T08:00:00+07:00'),
        ('expense', 123000, $1, $2, '2026-11-02T08:00:00+07:00')`,
      [defaultFund, cat("Ăn uống"), cat("Lương", "income")],
    );
    const rows = await q<{ month_start: string; expense: string; income: string }>(
      "select month_start::text, expense, income from fn_monthly_totals($1, '2026-10-20', 4)",
      [uid],
    );
    expect(rows.map((r) => [r.month_start, num(r.expense), num(r.income)])).toEqual([
      ["2026-07-01", 0, 0],
      ["2026-08-01", 500000, 0],
      ["2026-09-01", 300000, 0],
      ["2026-10-01", 700000, 9000000],
    ]);
  });
});

describe("tiến độ quỹ mục tiêu (v_fund_goal_progress)", () => {
  let uid: string;

  beforeAll(async () => {
    uid = await createUser(db, "goal@example.com");
    await asUser(db, uid)("update profiles set salary_day = 6");
  });

  it("15 triệu hạn 06/02/2027, đã có 6,5 triệu: 43%, 3 kỳ lương, góp 2.850.000/kỳ, chậm kế hoạch", async () => {
    const { q, defaultFund, cat } = await ids(uid);
    await q(
      "insert into transactions (type, amount, fund_id, category_id) values ('income', 30000000, $1, $2)",
      [defaultFund, cat("Lương", "income")],
    );
    const [{ id }] = await q<{ id: string }>(
      `insert into funds (name, kind, target_amount, target_date, created_at)
       values ('Quỹ Tết 2027', 'goal', 15000000, '2027-02-06', '2026-06-01T09:00:00+07:00') returning id`,
    );
    await q(
      "insert into transactions (type, amount, fund_id, to_fund_id) values ('transfer', 6500000, $1, $2)",
      [defaultFund, id],
    );
    const [g] = await q("select * from v_fund_goal_progress where fund_id = $1", [id]);
    expect(num(g.contributed)).toBe(6500000);
    expect(Math.round(num(g.pct))).toBe(43);
    expect(num(g.remaining)).toBe(8500000);
    expect(g.periods_left).toBe(3); // 06/11, 06/12, 06/01
    expect(num(g.per_period)).toBe(2850000);
    expect(g.days_left).toBe(99);
    expect(num(g.expected_pct)).toBeCloseTo(60.4, 1); // 151/250 ngày
    expect(g.behind_schedule).toBe(true);
  });

  it("quỹ vừa tạo hôm nay chưa bị coi là chậm", async () => {
    const { q } = await ids(uid);
    const [{ id }] = await q<{ id: string }>(
      "insert into funds (name, kind, target_amount, target_date) values ('Laptop', 'goal', 20000000, '2027-06-01') returning id",
    );
    const [g] = await q(
      "select expected_pct, behind_schedule from v_fund_goal_progress where fund_id = $1",
      [id],
    );
    expect(num(g.expected_pct)).toBe(0);
    expect(g.behind_schedule).toBe(false);
  });

  it("quỹ mục tiêu không có hạn: không tính góp mỗi kỳ, không bao giờ chậm", async () => {
    const { q } = await ids(uid);
    const [{ id }] = await q<{ id: string }>(
      "insert into funds (name, kind, target_amount) values ('Khẩn cấp', 'goal', 10000000) returning id",
    );
    const [g] = await q(
      "select per_period, expected_pct, behind_schedule, periods_left from v_fund_goal_progress where fund_id = $1",
      [id],
    );
    expect(g).toEqual({
      per_period: null,
      expected_pct: null,
      behind_schedule: false,
      periods_left: 0,
    });
  });

  it("hạn lấy theo countdown gắn kèm (lặp hằng năm thì sang năm sau)", async () => {
    const { q } = await ids(uid);
    const [{ id: cd }] = await q<{ id: string }>(
      "insert into countdowns (title, event_date, repeat_yearly) values ('Sinh nhật', '2000-12-24', true) returning id",
    );
    const [{ id }] = await q<{ id: string }>(
      "insert into funds (name, kind, target_amount, countdown_id) values ('Quà', 'goal', 2000000, $1) returning id",
      [cd],
    );
    const [g] = await q(
      "select deadline::text as deadline from v_fund_goal_progress where fund_id = $1",
      [id],
    );
    expect(g.deadline).toBe("2026-12-24");
    const [c] = await q("select fund_id from countdowns where id = $1", [cd]);
    expect(c.fund_id).toBe(id);
  });
});

describe("countdown (v_countdowns, fn_next_occurrence)", () => {
  it("lặp hằng năm tự chuyển sang năm sau khi đã qua; không lặp thì thành Đã qua", async () => {
    const uid = await createUser(db, "cd@example.com");
    const q = asUser(db, uid);
    await q(
      `insert into countdowns (title, event_date, repeat_yearly, created_at) values
        ('Kỷ niệm', '2020-03-08', true, '2026-01-01T00:00:00+07:00'),
        ('Thi IELTS', '2026-10-01', false, '2026-09-01T00:00:00+07:00'),
        ('Tết 2027', '2027-02-06', false, '2026-10-30T08:00:00+07:00'),
        ('Nhuận', '2024-02-29', true, '2026-01-01T00:00:00+07:00')`,
    );
    const rows = await q<{
      title: string;
      next_occurrence: string;
      days_left: number;
      is_past: boolean;
      elapsed_pct: string;
    }>(
      "select title, next_occurrence::text, days_left, is_past, elapsed_pct from v_countdowns order by title",
    );
    const by = Object.fromEntries(rows.map((r) => [r.title, r]));
    expect(by["Kỷ niệm"].next_occurrence).toBe("2027-03-08");
    expect(by["Kỷ niệm"].is_past).toBe(false);
    expect(by["Thi IELTS"].is_past).toBe(true);
    expect(by["Tết 2027"].days_left).toBe(99);
    expect(num(by["Tết 2027"].elapsed_pct)).toBe(0);
    expect(by["Nhuận"].next_occurrence).toBe("2027-02-28");
  });
});

describe("tự động góp sau lương (recurring_rules + fn_run_recurring)", () => {
  it("bật tự động góp tạo quy tắc + countdown cùng tên; job chạy đúng ngày lương, không chạy trùng", async () => {
    const uid = await createUser(db, "auto@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    await q("update profiles set salary_day = 6");
    await q(
      "insert into transactions (type, amount, fund_id, category_id) values ('income', 22000000, $1, $2)",
      [defaultFund, cat("Lương", "income")],
    );
    const [{ id: tet }] = await q<{ id: string }>(
      `insert into funds (name, kind, target_amount, target_date, auto_contribution, auto_from_fund_id)
       values ('Quỹ Tết', 'goal', 15000000, '2027-02-06', 1000000, $1) returning id`,
      [defaultFund],
    );
    const [rule] = await q("select amount, next_run_on::text as next, active from recurring_rules");
    expect(rule).toMatchObject({ next: "2026-11-06", active: true });
    expect(num(rule.amount)).toBe(1000000);
    const [cd] = await q("select title, event_date::text as d, fund_id from countdowns");
    expect(cd).toEqual({ title: "Quỹ Tết", d: "2027-02-06", fund_id: tet });
    const [f] = await q("select countdown_id is not null as linked from funds where id = $1", [
      tet,
    ]);
    expect(f.linked).toBe(true);

    const svc = asService(db);
    expect(await svc("select * from fn_run_recurring('2026-11-05T06:00:00+07:00')")).toEqual([]);
    const ran = await svc("select * from fn_run_recurring('2026-11-06T06:00:00+07:00')");
    expect(ran).toHaveLength(1);
    expect(ran[0]).toMatchObject({ from_fund: "Sinh hoạt", to_fund: "Quỹ Tết" });
    expect(await svc("select * from fn_run_recurring('2026-11-06T09:00:00+07:00')")).toEqual([]);

    const [after] = await q("select next_run_on::text as next from recurring_rules");
    expect(after.next).toBe("2026-12-06");
    const [bal] = await q("select balance from v_fund_balances where id = $1", [tet]);
    expect(num(bal.balance)).toBe(1000000);
    const [tx] = await q("select source, note from transactions where type = 'transfer'");
    expect(tx).toEqual({ source: "auto", note: "Tự động sau lương" });

    // Tắt tự động góp → quy tắc ngừng.
    await q("update funds set auto_contribution = null, auto_from_fund_id = null where id = $1", [
      tet,
    ]);
    const [off] = await q("select active from recurring_rules");
    expect(off.active).toBe(false);
    await setNow(db, "2026-10-30T10:00:00+07:00");
  });

  it("fn_pay_periods: ngày lương 31 dùng ngày cuối tháng", async () => {
    const [{ n }] = (
      await db.query<{ n: number }>("select fn_pay_periods('2027-01-15', '2027-04-01', 31) as n")
    ).rows;
    expect(n).toBe(3); // 31/01, 28/02, 31/03
    const [{ d }] = (
      await db.query<{ d: string }>("select fn_next_salary_date('2027-01-31', 31)::text as d")
    ).rows;
    expect(d).toBe("2027-02-28");
  });
});

describe("Telegram", () => {
  it("mã liên kết 6 ký tự; webhook nhận cả dạng có gạch; mã dùng một lần", async () => {
    const uid = await createUser(db, "tg@example.com");
    const q = asUser(db, uid);
    const [{ r }] = await q<{ r: { code: string } }>("select create_telegram_link_code() as r");
    expect(r.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const svc = asService(db);
    const dashed = `${r.code.slice(0, 4)}-${r.code.slice(4).toLowerCase()}`;
    const [{ u }] = await svc("select link_telegram($1, 555001, 'minh') as u", [dashed]);
    expect(u).toBe(uid);
    const [{ u: again }] = await svc("select link_telegram($1, 555001, 'minh') as u", [r.code]);
    expect(again).toBeNull();
    const [p] = await q("select telegram_chat_id, telegram_username from profiles");
    expect(p).toEqual({ telegram_chat_id: 555001, telegram_username: "minh" });

    await expect(q("update profiles set telegram_chat_id = 1")).rejects.toThrow(
      /permission denied/,
    );
    await expect(q("select link_telegram('AAAAAA', 1, 'x')")).rejects.toThrow(/permission denied/);
  });

  it("fn_telegram_log ghi chi tiêu vào quỹ mặc định, đoán danh mục theo tên, trả ngân sách còn lại", async () => {
    const uid = await createUser(db, "tglog@example.com");
    const { q, defaultFund } = await ids(uid);
    await q("update funds set monthly_budget = 5000000 where id = $1", [defaultFund]);
    const [{ r }] = await q<{ r: { code: string } }>("select create_telegram_link_code() as r");
    const svc = asService(db);
    await svc("select link_telegram($1, 777, null)", [r.code]);

    const [{ res }] = await svc<{ res: Record<string, unknown> }>(
      "select fn_telegram_log(777, 'expense', 65000, 'cơm trưa', 'Ăn uống', '2026-10-30T12:31:00+07:00') as res",
    );
    expect(res).toMatchObject({ status: "ok", category: "Ăn uống", fund: "Sinh hoạt" });
    expect(num(res.budget_remaining)).toBe(4935000);

    const [{ res: unknownCat }] = await svc<{ res: Record<string, unknown> }>(
      "select fn_telegram_log(777, 'expense', 10000, 'linh tinh', 'Không có', now()) as res",
    );
    expect(unknownCat.category).toBe("Khác");

    const [{ res: notLinked }] = await svc<{ res: Record<string, unknown> }>(
      "select fn_telegram_log(999, 'expense', 10000, 'x', 'Khác', now()) as res",
    );
    expect(notLinked.status).toBe("not_linked");

    const [tx] = await q(
      "select source, note, occurred_at::text as at from transactions order by amount desc limit 1",
    );
    expect(tx.source).toBe("telegram");
    expect(tx.note).toBe("cơm trưa");
  });

  it("fn_daily_notifications: countdown khớp remind_days, không gửi lại sau khi đã ghi log", async () => {
    const uid = await createUser(db, "notify@example.com");
    const q = asUser(db, uid);
    const [{ r }] = await q<{ r: { code: string } }>("select create_telegram_link_code() as r");
    const svc = asService(db);
    await svc("select link_telegram($1, 888, null)", [r.code]);
    await q(
      `insert into countdowns (title, event_date, remind_days) values
        ('Sinh nhật mẹ', '2026-11-02', '{0,1,3}'),
        ('Xa lắm', '2026-12-30', '{0,1,3}')`,
    );
    const rows = await svc<{
      user_id: string;
      kind: string;
      ref_id: string;
      payload: { title: string; days_left: number };
    }>("select * from fn_daily_notifications(null) where user_id = $1", [uid]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("countdown");
    expect(rows[0].payload).toMatchObject({ title: "Sinh nhật mẹ", days_left: 3 });

    await svc(
      "insert into notification_log (user_id, kind, ref_id, sent_on) values ($1, 'countdown', $2, '2026-10-30')",
      [uid, rows[0].ref_id],
    );
    expect(
      await svc("select * from fn_daily_notifications(null) where user_id = $1", [uid]),
    ).toEqual([]);

    await q("update profiles set notify_countdowns = false");
    expect(
      await svc(
        "select * from fn_daily_notifications('2026-11-01T08:00:00+07:00') where user_id = $1",
        [uid],
      ),
    ).toEqual([]);
    await setNow(db, "2026-10-30T10:00:00+07:00");
  });

  it("fn_daily_notifications: ngân sách vượt 80% chỉ báo một lần trong tháng", async () => {
    const uid = await createUser(db, "budgetnotify@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    await q("update funds set monthly_budget = 1000000 where id = $1", [defaultFund]);
    await q(
      "insert into transactions (type, amount, fund_id, category_id, occurred_at) values ('expense', 850000, $1, $2, '2026-10-30T09:00:00+07:00')",
      [defaultFund, cat("Ăn uống")],
    );
    const [{ r }] = await q<{ r: { code: string } }>("select create_telegram_link_code() as r");
    const svc = asService(db);
    await svc("select link_telegram($1, 999001, null)", [r.code]);
    const rows = await svc<{ kind: string; ref_id: string }>(
      "select kind, ref_id from fn_daily_notifications(null) where user_id = $1",
      [uid],
    );
    expect(rows.map((x) => x.kind)).toEqual(["budget_80"]);
    await svc(
      "insert into notification_log (user_id, kind, ref_id, sent_on) values ($1, 'budget_80', $2, '2026-10-20')",
      [uid, rows[0].ref_id],
    );
    expect(
      await svc("select * from fn_daily_notifications(null) where user_id = $1", [uid]),
    ).toEqual([]);
  });

  it("fn_evening_summaries: chỉ trả người tới giờ tổng kết, kèm tổng hôm nay và trung bình 7 ngày", async () => {
    const uid = await createUser(db, "evening@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    const [{ r }] = await q<{ r: { code: string } }>("select create_telegram_link_code() as r");
    const svc = asService(db);
    await svc("select link_telegram($1, 424242, null)", [r.code]);
    await q(
      `insert into transactions (type, amount, fund_id, category_id, occurred_at) values
        ('expense', 120000, $1, $2, '2026-10-30T12:00:00+07:00'),
        ('expense', 700000, $1, $2, '2026-10-27T12:00:00+07:00')`,
      [defaultFund, cat("Ăn uống")],
    );
    expect(
      await svc(
        "select * from fn_evening_summaries('2026-10-30T20:00:00+07:00') where user_id = $1",
        [uid],
      ),
    ).toEqual([]);
    const [row] = await svc<{ payload: { total: number; avg7: number } }>(
      "select * from fn_evening_summaries('2026-10-30T21:05:00+07:00') where user_id = $1",
      [uid],
    );
    expect(num(row.payload.total)).toBe(120000);
    expect(num(row.payload.avg7)).toBe(100000);
    await setNow(db, "2026-10-30T10:00:00+07:00");
  });

  it("fn_expense_reminders: mặc định 20:00, kèm số khoản chi hôm nay; tắt hoặc đã gửi thì không trả", async () => {
    const uid = await createUser(db, "reminder@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    const [{ r }] = await q<{ r: { code: string } }>("select create_telegram_link_code() as r");
    const svc = asService(db);
    await svc("select link_telegram($1, 434343, null)", [r.code]);
    await q(
      `insert into transactions (type, amount, fund_id, category_id, occurred_at) values
        ('expense', 65000, $1, $2, '2026-10-30T12:00:00+07:00'),
        ('expense', 120000, $1, $2, '2026-10-30T18:00:00+07:00'),
        ('expense', 700000, $1, $2, '2026-10-29T12:00:00+07:00')`,
      [defaultFund, cat("Ăn uống")],
    );
    const at = (iso: string) =>
      svc<{ today: string; payload: { count: number; total: number; can_log: boolean } }>(
        "select * from fn_expense_reminders($1) where user_id = $2",
        [iso, uid],
      );

    expect(await at("2026-10-30T19:50:00+07:00")).toEqual([]);
    const [row] = await at("2026-10-30T20:05:00+07:00");
    expect(num(row.payload.count)).toBe(2);
    expect(num(row.payload.total)).toBe(185000);
    expect(row.payload.can_log).toBe(true);
    expect(await at("2026-10-30T20:20:00+07:00")).toEqual([]);

    await svc(
      "insert into notification_log (user_id, kind, ref_id, sent_on) values ($1, 'expense_reminder', null, '2026-10-30')",
      [uid],
    );
    expect(await at("2026-10-30T20:05:00+07:00")).toEqual([]);

    await q("update profiles set expense_reminder_at = '12:00'");
    expect(num((await at("2026-10-31T12:00:00+07:00"))[0].payload.count)).toBe(0);
    await q("update profiles set expense_reminder_at = null");
    expect(await at("2026-10-31T12:00:00+07:00")).toEqual([]);
    await setNow(db, "2026-10-30T10:00:00+07:00");
  });
});

describe("hoá đơn định kỳ (v_bills, fn_pay_bill)", () => {
  let uid: string;
  let rent: string;

  beforeAll(async () => {
    uid = await createUser(db, "bills@example.com");
    const { q, defaultFund, cat } = await ids(uid);
    [{ id: rent }] = await q<{ id: string }>(
      `insert into recurring_rules (kind, name, amount, fund_id, category_id, day_of_month, next_run_on)
       values ('bill', 'Tiền nhà', 4500000, $1, $2, 5, '2026-11-05') returning id`,
      [defaultFund, cat("Hoá đơn")],
    );
  });

  it("v_bills: số ngày tới hạn, chưa trả trong tháng; hoá đơn bắt buộc có tên", async () => {
    const { q, defaultFund } = await ids(uid);
    const [b] = await q(
      "select days_left, paid_this_month, last_paid_at from v_bills where id = $1",
      [rent],
    );
    expect(b).toEqual({ days_left: 6, paid_this_month: false, last_paid_at: null });
    await expect(
      q(
        "insert into recurring_rules (kind, amount, fund_id, day_of_month, next_run_on) values ('bill', 1000, $1, 1, '2026-11-01')",
        [defaultFund],
      ),
    ).rejects.toThrow(/recurring_bill_needs_name/);
  });

  it("fn_pay_bill ghi khoản chi đúng danh mục / quỹ, dời hạn sang tháng sau; trả sớm vẫn sang tháng sau hạn", async () => {
    const { q, defaultFund } = await ids(uid);
    const [{ r }] = await q<{ r: Record<string, unknown> }>("select fn_pay_bill($1) as r", [rent]);
    expect(num(r.amount)).toBe(4500000);
    expect(r.next_run_on).toBe("2026-12-05");

    const [tx] = await q(
      `select t.type, t.amount, t.note, t.source, t.fund_id, c.name as category
       from transactions t join categories c on c.id = t.category_id where t.id = $1`,
      [r.transaction_id],
    );
    expect(tx).toMatchObject({
      type: "expense",
      note: "Tiền nhà",
      source: "web",
      fund_id: defaultFund,
      category: "Hoá đơn",
    });
    expect(num(tx.amount)).toBe(4500000);

    const [b] = await q(
      "select days_left, paid_this_month, last_paid_amount from v_bills where id = $1",
      [rent],
    );
    expect(b.days_left).toBe(36);
    expect(b.paid_this_month).toBe(true);
    expect(num(b.last_paid_amount)).toBe(4500000);
  });

  it("số tiền thật khác số dự kiến; hoá đơn quá hạn nhiều tháng chỉ dời tới hạn gần nhất sau ngày trả", async () => {
    const { q, defaultFund } = await ids(uid);
    const [{ id: power }] = await q<{ id: string }>(
      `insert into recurring_rules (kind, name, amount, fund_id, day_of_month, next_run_on)
       values ('bill', 'Tiền điện', 800000, $1, 31, '2026-08-31') returning id`,
      [defaultFund],
    );
    const [before] = await q("select days_left from v_bills where id = $1", [power]);
    expect(before.days_left).toBe(-60);

    const [{ r }] = await q<{ r: Record<string, unknown> }>(
      "select fn_pay_bill($1, 1234000, '2026-10-30T09:00:00+07:00') as r",
      [power],
    );
    expect(num(r.amount)).toBe(1234000);
    expect(r.next_run_on).toBe("2026-10-31");
    // Không chọn danh mục → rơi về "Hoá đơn".
    const [tx] = await q(
      "select c.name from transactions t join categories c on c.id = t.category_id where t.id = $1",
      [r.transaction_id],
    );
    expect(tx.name).toBe("Hoá đơn");

    await expect(q("select fn_pay_bill($1, 0)", [power])).rejects.toThrow(
      /amount_must_be_positive/,
    );
  });

  it("hoá đơn 3 tháng/lần: hạn tới nhảy đúng một quý, trễ nhiều quý chỉ tới quý gần nhất", async () => {
    const { q, defaultFund } = await ids(uid);
    const [{ id }] = await q<{ id: string }>(
      `insert into recurring_rules (kind, name, amount, fund_id, day_of_month, interval_months, next_run_on)
       values ('bill', 'Tiền nhà quý', 13500000, $1, 5, 3, '2026-11-05') returning id`,
      [defaultFund],
    );
    const [{ r }] = await q<{ r: Record<string, unknown> }>("select fn_pay_bill($1) as r", [id]);
    expect(r.next_run_on).toBe("2027-02-05");
    const [v] = await q("select interval_months from v_bills where id = $1", [id]);
    expect(v.interval_months).toBe(3);

    await q("update recurring_rules set next_run_on = '2026-02-05' where id = $1", [id]);
    const [{ r: late }] = await q<{ r: Record<string, unknown> }>("select fn_pay_bill($1) as r", [
      id,
    ]);
    expect(late.next_run_on).toBe("2026-11-05");

    await expect(
      q(
        "insert into recurring_rules (kind, name, amount, fund_id, day_of_month, interval_months, next_run_on) values ('bill', 'Sai', 1, $1, 1, 5, '2026-11-01')",
        [defaultFund],
      ),
    ).rejects.toThrow(/interval_months/);
  });

  it("RLS: người khác không trả hộ được; bot đánh dấu đã trả dùng cùng quy tắc", async () => {
    const other = await createUser(db, "bills-other@example.com");
    const qo = asUser(db, other);
    await expect(qo("select fn_pay_bill($1)", [rent])).rejects.toThrow(/bill_not_found/);

    const { q } = await ids(uid);
    const [{ r: code }] = await q<{ r: { code: string } }>(
      "select create_telegram_link_code() as r",
    );
    const svc = asService(db);
    await svc("select link_telegram($1, 424242, null)", [code.code]);
    const [{ res }] = await svc<{ res: Record<string, unknown> }>(
      "select fn_mark_bill_paid($1, 424242) as res",
      [rent],
    );
    expect(res).toMatchObject({ status: "ok", name: "Tiền nhà" });
    const [after] = await q("select next_run_on::text as next from recurring_rules where id = $1", [
      rent,
    ]);
    expect(after.next).toBe("2027-01-05");
    const [{ res: wrongChat }] = await svc<{ res: Record<string, unknown> }>(
      "select fn_mark_bill_paid($1, 1) as res",
      [rent],
    );
    expect(wrongChat.status).toBe("not_found");
  });

  it("fn_daily_notifications: hoá đơn tới hạn trong 3 ngày được nhắc, hoá đơn tạm dừng thì không", async () => {
    const { q, defaultFund } = await ids(uid);
    await q(
      `insert into recurring_rules (kind, name, amount, fund_id, day_of_month, next_run_on, active) values
        ('bill', 'Internet', 300000, $1, 2, '2026-11-02', true),
        ('bill', 'Gym', 500000, $1, 1, '2026-11-01', false)`,
      [defaultFund],
    );
    const svc = asService(db);
    const rows = await svc<{ kind: string; payload: Record<string, unknown> }>(
      "select kind, payload from fn_daily_notifications(null) where user_id = $1 and kind = 'bill'",
      [uid],
    );
    // "Tiền điện" (hạn 31/10, còn 1 ngày) cũng được nhắc; "Gym" tạm dừng thì không.
    expect(rows.map((r) => [r.payload.name, r.payload.days_left]).sort()).toEqual([
      ["Internet", 3],
      ["Tiền điện", 1],
    ]);
  });
});

describe("đổi quỹ mặc định và xoá quỹ", () => {
  let uid: string;
  const fundId = async (name: string) =>
    (await asUser(db, uid)<{ id: string }>("select id from funds where name = $1", [name]))[0].id;

  beforeAll(async () => {
    uid = await createUser(db, "remove@example.com");
  });

  it("quỹ chưa có giao dịch: xoá hẳn", async () => {
    const q = asUser(db, uid);
    const id = await fundId("Quỹ khẩn cấp");
    expect(await q("select fn_remove_fund($1) as r", [id])).toEqual([{ r: "deleted" }]);
    expect(await q("select id from funds where id = $1", [id])).toEqual([]);
  });

  it("quỹ đã có giao dịch, hoá đơn hoặc là nguồn tự góp: chỉ lưu trữ", async () => {
    const { q, cat } = await ids(uid);
    const [{ id: used }] = await q<{ id: string }>(
      "insert into funds (name, kind) values ('Đã dùng', 'free') returning id",
    );
    await q(
      "insert into transactions (type, amount, fund_id, category_id) values ('expense', 1000, $1, $2)",
      [used, cat("Ăn uống")],
    );
    const [{ id: billed }] = await q<{ id: string }>(
      "insert into funds (name, kind) values ('Có hoá đơn', 'free') returning id",
    );
    await q(
      `insert into recurring_rules (kind, name, amount, fund_id, day_of_month, next_run_on)
       values ('bill', 'Internet', 200000, $1, 5, '2026-11-05')`,
      [billed],
    );
    const [{ id: source }] = await q<{ id: string }>(
      "insert into funds (name, kind) values ('Nguồn góp', 'free') returning id",
    );
    await q(
      `insert into funds (name, kind, target_amount, auto_contribution, auto_from_fund_id)
       values ('Mục tiêu', 'goal', 5000000, 500000, $1)`,
      [source],
    );
    for (const id of [used, billed, source]) {
      expect(await q("select fn_remove_fund($1) as r", [id])).toEqual([{ r: "archived" }]);
      const [f] = await q("select archived_at is not null as archived from funds where id = $1", [
        id,
      ]);
      expect(f).toEqual({ archived: true });
    }
  });

  it("quỹ mặc định không xoá được; đổi mặc định sang quỹ khác rồi mới xoá", async () => {
    const q = asUser(db, uid);
    const living = await fundId("Sinh hoạt");
    const saving = await fundId("Tiết kiệm");
    await expect(q("select fn_remove_fund($1)", [living])).rejects.toThrow(
      /default_fund_protected/,
    );
    await q("select fn_set_default_fund($1)", [saving]);
    expect(await q("select name from funds where is_default")).toEqual([{ name: "Tiết kiệm" }]);
    expect(await q("select fn_remove_fund($1) as r", [living])).toEqual([{ r: "deleted" }]);
  });

  it("không đặt mặc định cho quỹ mục tiêu, quỹ đã lưu trữ hay quỹ của người khác", async () => {
    const q = asUser(db, uid);
    const goal = await fundId("Mục tiêu");
    const archived = await fundId("Đã dùng");
    await expect(q("select fn_set_default_fund($1)", [goal])).rejects.toThrow(
      /fund_cannot_be_default/,
    );
    await expect(q("select fn_set_default_fund($1)", [archived])).rejects.toThrow(
      /fund_cannot_be_default/,
    );
    const other = await createUser(db, "remove-other@example.com");
    const qo = asUser(db, other);
    await expect(qo("select fn_set_default_fund($1)", [goal])).rejects.toThrow(/fund_not_found/);
    await expect(qo("select fn_remove_fund($1)", [goal])).rejects.toThrow(/fund_not_found/);
  });
});

describe("xoá tài khoản", () => {
  it("delete_account xoá sạch dữ liệu của người dùng (kể cả quỹ mặc định)", async () => {
    const uid = await createUser(db, "bye@example.com");
    const q = asUser(db, uid);
    await q("select delete_account()").catch((e) => {
      // auth.users thật thuộc về supabase_auth_admin; trong PGlite owner là postgres nên luôn xoá được.
      throw e;
    });
    const [{ n }] = (
      await db.query<{ n: number }>("select count(*)::int as n from funds where user_id = $1", [
        uid,
      ])
    ).rows;
    expect(n).toBe(0);
  });
});
