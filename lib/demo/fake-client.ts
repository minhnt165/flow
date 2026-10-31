// Client Supabase giả cho chế độ demo: dữ liệu trong bộ nhớ, view tính lại bằng JS theo cùng quy tắc SQL.
// Chỉ hỗ trợ đúng những phương thức lib/supabase/* đang dùng.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  addMonths,
  APP_TZ,
  daysBetween,
  localDate,
  monthStart,
  nextOccurrenceOn,
  prevOccurrenceOn,
  toIso,
} from "@/lib/dates";
import type {
  BillView,
  CountdownView,
  FundMonth,
  FundWithBalance,
  GoalProgress,
  HabitView,
  RecurringRule,
  TodoView,
  Transaction,
} from "@/lib/supabase/types";
import {
  nextBillDueAfter,
  payPeriods,
  perPeriodNeeded,
} from "@/supabase/functions/_shared/goal.ts";
import { buildFixtures, DEMO_USER, type Fixtures } from "./fixtures";

type Row = Record<string, unknown>;

class Store {
  db: Fixtures = buildFixtures();
  today = () => localDate(new Date(), APP_TZ);

  balances(): FundWithBalance[] {
    return this.db.funds.map((f) => {
      let balance = f.opening_balance;
      for (const t of this.db.transactions) {
        if (t.type === "income" && t.fund_id === f.id) balance += t.amount;
        else if (t.type === "expense" && t.fund_id === f.id) balance -= t.amount;
        else if (t.type === "transfer" && t.to_fund_id === f.id) balance += t.amount;
        else if (t.type === "transfer" && t.fund_id === f.id) balance -= t.amount;
      }
      return { ...f, balance };
    });
  }

  countdowns(): CountdownView[] {
    const today = this.today();
    return this.db.countdowns.map((c) => {
      const next = nextOccurrenceOn(c.event_date, c.repeat_months, today);
      const created = localDate(new Date(c.created_at), APP_TZ);
      const prev = prevOccurrenceOn(c.event_date, c.repeat_months, next);
      const start = prev ? (created > prev ? created : prev) : created < next ? created : next;
      const total = daysBetween(start, next);
      return {
        ...c,
        next_occurrence: next,
        days_left: daysBetween(today, next),
        cycle_start: start,
        elapsed_pct:
          total <= 0
            ? 100
            : Math.min(
                100,
                Math.max(0, Math.round((daysBetween(start, today) * 1000) / total) / 10),
              ),
        is_past: !c.repeat_months && c.event_date < today,
        repeat_yearly: c.repeat_months === 12,
      };
    });
  }

  budgetMonth(month?: string | null): FundMonth[] {
    const today = this.today();
    const m0 = monthStart(month ?? today);
    const m1 = addMonths(m0, 1);
    const from = toIso(m0, "00:00");
    const to = toIso(m1, "00:00");
    const monthEnd = addDays(m1, -1);
    return this.db.funds
      .filter((f) => f.kind === "monthly_budget" && !f.archived_at)
      .map((f) => {
        const spent = this.db.transactions
          .filter(
            (t) =>
              t.type === "expense" &&
              t.fund_id === f.id &&
              t.occurred_at >= from &&
              t.occurred_at < to,
          )
          .reduce((s, t) => s + t.amount, 0);
        return {
          fund_id: f.id,
          user_id: f.user_id,
          name: f.name,
          monthly_budget: f.monthly_budget,
          month_start: m0,
          spent,
          remaining: f.monthly_budget === null ? null : f.monthly_budget - spent,
          pct_used: f.monthly_budget ? Math.round((spent * 1000) / f.monthly_budget) / 10 : null,
          days_left:
            today < m0
              ? daysBetween(m0, monthEnd) + 1
              : today > monthEnd
                ? 0
                : daysBetween(today, monthEnd) + 1,
        };
      });
  }

  goals(): GoalProgress[] {
    const today = this.today();
    const salaryDay = this.db.profile.salary_day ?? 1;
    const cds = this.countdowns();
    return this.balances()
      .filter((f) => f.kind === "goal" && !f.archived_at)
      .map((f) => {
        const deadline =
          (f.countdown_id && cds.find((c) => c.id === f.countdown_id)?.next_occurrence) ||
          f.target_date;
        const start = localDate(new Date(f.created_at), APP_TZ);
        const target = f.target_amount ?? 1;
        const remaining = Math.max(target - f.balance, 0);
        const pct = Math.round((f.balance * 1000) / target) / 10;
        const periods = payPeriods(today, deadline, salaryDay);
        const expected = !deadline
          ? null
          : deadline <= start
            ? 100
            : Math.min(
                100,
                Math.max(
                  0,
                  Math.round((daysBetween(start, today) * 1000) / daysBetween(start, deadline)) /
                    10,
                ),
              );
        const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
        const inflow = this.db.transactions
          .filter((t) => t.to_fund_id === f.id && t.occurred_at >= since)
          .reduce((s, t) => s + t.amount, 0);
        return {
          fund_id: f.id,
          user_id: f.user_id,
          name: f.name,
          icon: f.icon,
          color: f.color,
          target_amount: target,
          contributed: f.balance,
          remaining,
          pct,
          deadline,
          start_date: start,
          today,
          salary_day: salaryDay,
          days_left: deadline ? daysBetween(today, deadline) : null,
          periods_left: periods,
          per_period: remaining === 0 ? 0 : deadline ? perPeriodNeeded(remaining, periods) : null,
          expected_pct: expected,
          behind_schedule: expected !== null && f.balance < target && pct < expected,
          auto_contribution: f.auto_contribution,
          auto_from_fund_id: f.auto_from_fund_id,
          countdown_id: f.countdown_id,
          avg_monthly_contribution: Math.round(inflow / 3),
        };
      });
  }

  /** v_bills: hoá đơn kèm số ngày tới hạn và lần trả gần nhất. */
  bills(): BillView[] {
    const today = this.today();
    const monthFrom = toIso(monthStart(today), "00:00");
    return this.db.rules
      .filter((r) => r.kind === "bill")
      .map((r) => {
        const paid = this.db.transactions
          .filter((t) => t.recurring_rule_id === r.id && t.type === "expense")
          .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
        return {
          id: r.id,
          user_id: r.user_id,
          name: r.name ?? "",
          amount: r.amount,
          fund_id: r.fund_id,
          category_id: r.category_id,
          day_of_month: r.day_of_month,
          next_run_on: r.next_run_on,
          active: r.active,
          created_at: String((r as Row).created_at ?? ""),
          today,
          days_left: daysBetween(today, r.next_run_on),
          last_paid_at: paid?.occurred_at ?? null,
          last_paid_amount: paid?.amount ?? null,
          paid_this_month: Boolean(paid && paid.occurred_at >= monthFrom),
          interval_months: r.interval_months ?? 1,
        };
      });
  }

  /** fn_pay_bill: ghi khoản chi và dời hạn tới ngày đến hạn đầu tiên sau max(hạn, ngày trả). */
  payBill(ruleId: string, amount: number | null, paidAt: string | null) {
    const rule = this.db.rules.find((r) => r.id === ruleId && r.kind === "bill") as
      RecurringRule | undefined;
    if (!rule) throw new Error("bill_not_found");
    const occurredAt = paidAt ?? new Date().toISOString();
    const paidOn = localDate(new Date(occurredAt), APP_TZ);
    const category =
      rule.category_id ??
      this.db.categories.find((c) => c.type === "expense" && c.name === "Hoá đơn")?.id ??
      this.db.categories.find((c) => c.type === "expense")!.id;
    const tx: Transaction = {
      id: crypto.randomUUID(),
      user_id: DEMO_USER.id,
      type: "expense",
      amount: amount ?? rule.amount,
      fund_id: rule.fund_id,
      to_fund_id: null,
      category_id: category,
      note: rule.name,
      occurred_at: occurredAt,
      source: "web",
      recurring_rule_id: rule.id,
      created_at: new Date().toISOString(),
    };
    this.db.transactions.push(tx);
    rule.next_run_on = nextBillDueAfter(
      rule.next_run_on,
      paidOn,
      rule.day_of_month,
      rule.interval_months ?? 1,
    );
    return { transaction_id: tx.id, amount: tx.amount, next_run_on: rule.next_run_on };
  }

  /** v_todos: days_left null khi không hạn, âm = quá hạn. */
  todos(): TodoView[] {
    const today = this.today();
    return this.db.todos.map((x) => ({
      ...x,
      today,
      days_left: x.due_on ? daysBetween(today, x.due_on) : null,
      done: x.done_at !== null,
    }));
  }

  /** v_habits: streak kết thúc ở hôm nay hoặc hôm qua, week_count từ thứ Hai, last7 kết thúc hôm nay. */
  habits(): HabitView[] {
    const today = this.today();
    // Thứ Hai của tuần hiện tại (getUTCDay: 0 = Chủ nhật).
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
    const monday = addDays(today, -((dow + 6) % 7));
    return this.db.habits.map((h) => {
      const days = new Set(this.db.habitLogs.filter((l) => l.habit_id === h.id).map((l) => l.day));
      const doneToday = days.has(today);
      let streak = 0;
      let cursor = doneToday ? today : addDays(today, -1);
      while (days.has(cursor)) {
        streak += 1;
        cursor = addDays(cursor, -1);
      }
      return {
        ...h,
        today,
        done_today: doneToday,
        streak,
        week_count: [...days].filter((d) => d >= monday && d <= today).length,
        total_count: days.size,
        last7: Array.from({ length: 7 }, (_, i) => days.has(addDays(today, i - 6))),
      };
    });
  }

  toggleHabit(id: string, day: string | null) {
    if (!this.db.habits.some((h) => h.id === id)) throw new Error("habit_not_found");
    const d = day ?? this.today();
    const i = this.db.habitLogs.findIndex((l) => l.habit_id === id && l.day === d);
    if (i >= 0) {
      this.db.habitLogs.splice(i, 1);
      return false;
    }
    this.db.habitLogs.push({ habit_id: id, day: d });
    return true;
  }

  // Cùng quy tắc với fn_remove_fund: quỹ đã có lịch sử thì lưu trữ, chưa dùng thì xoá hẳn.
  removeFund(id: string) {
    const used =
      this.db.transactions.some((t) => t.fund_id === id || t.to_fund_id === id) ||
      this.db.rules.some((r) => r.kind === "bill" && r.fund_id === id) ||
      this.db.funds.some((f) => f.auto_from_fund_id === id);
    const i = this.db.funds.findIndex((f) => f.id === id);
    if (used) {
      this.db.funds[i].archived_at = new Date().toISOString();
      return "archived";
    }
    this.db.funds.splice(i, 1);
    return "deleted";
  }

  table(name: string): Row[] {
    switch (name) {
      case "v_fund_balances":
        return this.balances();
      case "v_bills":
        return this.bills();
      case "v_fund_goal_progress":
        return this.goals();
      case "v_countdowns":
        return this.countdowns();
      case "v_fund_month":
        return this.budgetMonth();
      case "profiles":
        return [this.db.profile];
      case "funds":
        return this.db.funds;
      case "categories":
        return this.db.categories;
      case "transactions":
        return this.db.transactions;
      case "countdowns":
        return this.db.countdowns;
      case "recurring_rules":
        return this.db.rules;
      case "v_todos":
        return this.todos();
      case "todos":
        return this.db.todos;
      case "v_habits":
        return this.habits();
      case "habits":
        return this.db.habits;
      case "notes":
        return this.db.notes;
      default:
        return [];
    }
  }

  mutable(name: string): Row[] {
    const map: Record<string, Row[]> = {
      funds: this.db.funds,
      categories: this.db.categories,
      transactions: this.db.transactions,
      countdowns: this.db.countdowns,
      recurring_rules: this.db.rules,
      todos: this.db.todos,
      habits: this.db.habits,
      notes: this.db.notes,
      profiles: [this.db.profile],
    };
    return map[name] ?? [];
  }

  rpc(name: string, args: Row): unknown {
    switch (name) {
      case "fn_budget_month":
        return this.budgetMonth(args.p_month as string | null);
      case "fn_month_summary": {
        const m0 = monthStart(String(args.p_month));
        const from = toIso(m0, "00:00");
        const to = toIso(addMonths(m0, 1), "00:00");
        const tx = this.db.transactions.filter((t) => t.occurred_at >= from && t.occurred_at < to);
        const sum = (list: Transaction[]) => list.reduce((s, t) => s + t.amount, 0);
        const byCat = new Map<string, number>();
        tx.filter((t) => t.type === "expense").forEach((t) =>
          byCat.set(t.category_id!, (byCat.get(t.category_id!) ?? 0) + t.amount),
        );
        const goalIds = new Set(this.db.funds.filter((f) => f.kind === "goal").map((f) => f.id));
        return {
          month: m0,
          total_expense: sum(tx.filter((t) => t.type === "expense")),
          total_income: sum(tx.filter((t) => t.type === "income")),
          total_saved: sum(
            tx.filter((t) => t.type === "transfer" && goalIds.has(t.to_fund_id ?? "")),
          ),
          by_category: [...byCat.entries()]
            .map(([id, amount]) => {
              const c = this.db.categories.find((x) => x.id === id)!;
              return {
                category_id: id,
                name: c.name,
                icon: c.icon,
                color: c.color,
                amount,
                count: 1,
              };
            })
            .sort((a, b) => b.amount - a.amount),
          by_fund: [],
        };
      }
      case "fn_fund_monthly_inflow": {
        const months = Number(args.p_months ?? 6);
        const cur = monthStart(this.today());
        return Array.from({ length: months }, (_, i) => {
          const m = addMonths(cur, i - months + 1);
          const from = toIso(m, "00:00");
          const to = toIso(addMonths(m, 1), "00:00");
          const amount = this.db.transactions
            .filter(
              (t) =>
                (t.to_fund_id === args.p_fund_id ||
                  (t.type === "income" && t.fund_id === args.p_fund_id)) &&
                t.occurred_at >= from &&
                t.occurred_at < to,
            )
            .reduce((s, t) => s + t.amount, 0);
          return { month_start: m, amount };
        });
      }
      case "fn_pay_bill":
        return this.payBill(
          String(args.p_rule_id),
          (args.p_amount as number | null) ?? null,
          (args.p_paid_at as string | null) ?? null,
        );
      case "fn_toggle_habit":
        return this.toggleHabit(String(args.p_habit_id), (args.p_day as string | null) ?? null);
      case "fn_remove_fund":
        return this.removeFund(String(args.p_fund_id));
      case "fn_set_default_fund":
        this.db.funds.forEach((f) => (f.is_default = f.id === args.p_fund_id));
        return null;
      case "create_telegram_link_code":
        return { code: "7X4K29", expires_at: new Date(Date.now() + 10 * 60_000).toISOString() };
      case "disconnect_telegram":
        this.db.profile.telegram_chat_id = null;
        this.db.profile.telegram_username = null;
        return null;
      default:
        return null;
    }
  }
}

type Filter = (r: Row) => boolean;

class Query implements PromiseLike<{ data: unknown; error: null }> {
  private filters: Filter[] = [];
  private orders: [string, boolean][] = [];
  private lim?: number;
  private rng?: [number, number];
  private mode: "many" | "single" | "maybe" = "many";
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload?: Row;

  constructor(
    private store: Store,
    private name: string,
  ) {}

  select() {
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v);
    return this;
  }
  is(col: string, v: unknown) {
    this.filters.push((r) => (r[col] ?? null) === v);
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]));
    return this;
  }
  gte(col: string, v: string) {
    this.filters.push((r) => String(r[col]) >= v);
    return this;
  }
  lt(col: string, v: string) {
    this.filters.push((r) => String(r[col]) < v);
    return this;
  }
  ilike(col: string, pattern: string) {
    const needle = pattern.replace(/%/g, "").replace(/\\/g, "").toLowerCase();
    this.filters.push((r) =>
      String(r[col] ?? "")
        .toLowerCase()
        .includes(needle),
    );
    return this;
  }
  or(expr: string) {
    const parts = expr.split(",").map((p) => p.split("."));
    this.filters.push((r) => parts.some(([col, , v]) => String(r[col]) === v));
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orders.push([col, opts.ascending ?? true]);
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  range(a: number, b: number) {
    this.rng = [a, b];
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  insert(obj: Row) {
    this.op = "insert";
    this.payload = obj;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  private exec() {
    let rows: Row[];
    if (this.op === "insert") {
      const row: Row = {
        id: crypto.randomUUID(),
        user_id: DEMO_USER.id,
        created_at: new Date().toISOString(),
        ...this.payload,
      };
      if (this.name === "transactions") row.recurring_rule_id ??= null;
      if (this.name === "countdowns") {
        row.fund_id ??= null;
        row.repeat_months ??= null;
        row.repeat_yearly = row.repeat_months === 12;
      }
      if (this.name === "funds") row.opening_balance ??= 0;
      if (this.name === "recurring_rules") row.interval_months ??= 1;
      if (this.name === "habits") {
        row.sort_order ??= 0;
        row.archived_at ??= null;
      }
      if (this.name === "notes") {
        row.pinned ??= false;
        row.updated_at = row.created_at;
      }
      if (this.name === "todos") {
        row.note ??= null;
        row.due_on ??= null;
        row.done_at ??= null;
      }
      this.store.mutable(this.name).push(row);
      rows = [row];
    } else if (this.op === "update") {
      rows = this.store.mutable(this.name).filter((r) => this.filters.every((f) => f(r)));
      rows.forEach((r) => Object.assign(r, this.payload));
      if (this.name === "notes") rows.forEach((r) => (r.updated_at = new Date().toISOString()));
    } else if (this.op === "delete") {
      const list = this.store.mutable(this.name);
      rows = list.filter((r) => this.filters.every((f) => f(r)));
      rows.forEach((r) => list.splice(list.indexOf(r), 1));
      // Xoá thói quen thì xoá luôn log (on delete cascade).
      if (this.name === "habits") {
        const ids = new Set(rows.map((r) => r.id));
        this.store.db.habitLogs = this.store.db.habitLogs.filter((l) => !ids.has(l.habit_id));
      }
    } else {
      rows = this.store.table(this.name).filter((r) => this.filters.every((f) => f(r)));
      if (this.orders.length) {
        rows = [...rows].sort((a, b) => {
          for (const [col, asc] of this.orders) {
            const x = a[col] as string | number | boolean | null;
            const y = b[col] as string | number | boolean | null;
            if (x === y) continue;
            if (x === null) return 1;
            if (y === null) return -1;
            return (x < y ? -1 : 1) * (asc ? 1 : -1);
          }
          return 0;
        });
      }
      if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
      if (this.lim !== undefined) rows = rows.slice(0, this.lim);
    }
    const copy = rows.map((r) => ({ ...r }));
    return { data: this.mode === "many" ? copy : (copy[0] ?? null), error: null };
  }

  then<A = { data: unknown; error: null }, B = never>(
    onfulfilled?: ((v: { data: unknown; error: null }) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    // Trễ nhẹ để thấy được skeleton / cập nhật lạc quan như khi gọi mạng thật.
    return new Promise<{ data: unknown; error: null }>((resolve) =>
      setTimeout(() => resolve(this.exec()), 120),
    ).then(onfulfilled, onrejected);
  }
}

let store: Store | undefined;

export function createDemoClient(): SupabaseClient {
  store ??= new Store();
  const s = store;
  const client = {
    from: (name: string) => new Query(s, name),
    rpc: (name: string, args: Row = {}) =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ data: s.rpc(name, args), error: null }), 120),
      ),
    functions: {
      invoke: async () => ({ data: { ok: true }, error: null }),
    },
    auth: {
      getUser: async () => ({
        data: { user: { id: DEMO_USER.id, email: DEMO_USER.email } },
        error: null,
      }),
      signOut: async () => ({ error: null }),
    },
  };
  return client as unknown as SupabaseClient;
}
