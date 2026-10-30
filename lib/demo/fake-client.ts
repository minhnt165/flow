// Client Supabase giả cho chế độ demo: dữ liệu trong bộ nhớ, view tính lại bằng JS theo cùng quy tắc SQL.
// Chỉ hỗ trợ đúng những phương thức lib/supabase/* đang dùng.
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, addMonths, APP_TZ, daysBetween, localDate, monthStart, toIso } from "@/lib/dates";
import type {
  CountdownView,
  FundMonth,
  FundWithBalance,
  GoalProgress,
  Transaction,
} from "@/lib/supabase/types";
import { payPeriods, perPeriodNeeded } from "@/supabase/functions/_shared/goal.ts";
import { buildFixtures, DEMO_USER, type Fixtures } from "./fixtures";

type Row = Record<string, unknown>;

function anniversary(event: string, year: number) {
  const [, m, d] = event.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${year}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

class Store {
  db: Fixtures = buildFixtures();
  today = () => localDate(new Date(), APP_TZ);

  balances(): FundWithBalance[] {
    return this.db.funds.map((f) => {
      let balance = 0;
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
      const y = Number(today.slice(0, 4));
      let next = c.event_date;
      if (c.repeat_yearly && c.event_date < today) {
        next =
          anniversary(c.event_date, y) >= today
            ? anniversary(c.event_date, y)
            : anniversary(c.event_date, y + 1);
      }
      const created = localDate(new Date(c.created_at), APP_TZ);
      const start =
        c.repeat_yearly && next > c.event_date
          ? [created, anniversary(c.event_date, Number(next.slice(0, 4)) - 1)].sort().at(-1)!
          : created < next
            ? created
            : next;
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
        is_past: !c.repeat_yearly && c.event_date < today,
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

  table(name: string): Row[] {
    switch (name) {
      case "v_fund_balances":
        return this.balances();
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
      if (this.name === "countdowns") row.fund_id ??= null;
      this.store.mutable(this.name).push(row);
      rows = [row];
    } else if (this.op === "update") {
      rows = this.store.mutable(this.name).filter((r) => this.filters.every((f) => f(r)));
      rows.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === "delete") {
      const list = this.store.mutable(this.name);
      rows = list.filter((r) => this.filters.every((f) => f(r)));
      rows.forEach((r) => list.splice(list.indexOf(r), 1));
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
