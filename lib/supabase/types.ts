// Kiểu dữ liệu khớp schema trong supabase/migrations. Tiền là numeric(14,0) → number nguyên trong JS.
// Khi đã link project thật có thể sinh lại bằng `pnpm db:types` để đối chiếu.

export type PaletteColor = "sky" | "orange" | "green" | "violet" | "pink" | "red" | "yellow";
export type FundKind = "monthly_budget" | "goal" | "free";
export type CategoryType = "expense" | "income";
export type TransactionType = "expense" | "income" | "transfer";
export type TransactionSource = "web" | "telegram" | "auto";
export type RecurringKind = "transfer" | "bill";

export type Profile = {
  id: string;
  display_name: string | null;
  salary_day: number | null;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  notify_bills: boolean;
  notify_countdowns: boolean;
  notify_budget: boolean;
  daily_summary_at: string | null;
  telegram_log_expense: boolean;
  timezone: string;
  created_at: string;
};

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "display_name"
    | "salary_day"
    | "notify_bills"
    | "notify_countdowns"
    | "notify_budget"
    | "daily_summary_at"
    | "telegram_log_expense"
    | "timezone"
  >
>;

export type Fund = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: PaletteColor;
  kind: FundKind;
  monthly_budget: number | null;
  target_amount: number | null;
  target_date: string | null;
  countdown_id: string | null;
  auto_contribution: number | null;
  auto_from_fund_id: string | null;
  is_default: boolean;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
};

/** Dòng của view v_fund_balances. */
export type FundWithBalance = Fund & { balance: number };

export type FundInput = Pick<
  Fund,
  | "name"
  | "icon"
  | "color"
  | "kind"
  | "monthly_budget"
  | "target_amount"
  | "target_date"
  | "countdown_id"
  | "auto_contribution"
  | "auto_from_fund_id"
>;

/** Dòng của view v_fund_month / function fn_budget_month. */
export type FundMonth = {
  fund_id: string;
  user_id: string;
  name: string;
  monthly_budget: number | null;
  month_start: string;
  spent: number;
  remaining: number | null;
  pct_used: number | null;
  days_left: number;
};

/** Dòng của view v_fund_goal_progress. */
export type GoalProgress = {
  fund_id: string;
  user_id: string;
  name: string;
  icon: string;
  color: PaletteColor;
  target_amount: number;
  contributed: number;
  remaining: number;
  pct: number;
  deadline: string | null;
  start_date: string;
  today: string;
  salary_day: number;
  days_left: number | null;
  periods_left: number;
  per_period: number;
  expected_pct: number;
  behind_schedule: boolean;
  auto_contribution: number | null;
  auto_from_fund_id: string | null;
  countdown_id: string | null;
  avg_monthly_contribution: number;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: PaletteColor;
  type: CategoryType;
  sort_order: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  fund_id: string;
  to_fund_id: string | null;
  category_id: string | null;
  note: string | null;
  occurred_at: string;
  source: TransactionSource;
  recurring_rule_id: string | null;
  created_at: string;
};

export type TransactionInput = Pick<
  Transaction,
  "type" | "amount" | "fund_id" | "to_fund_id" | "category_id" | "note" | "occurred_at"
>;

export type RecurringRule = {
  id: string;
  user_id: string;
  kind: RecurringKind;
  name: string | null;
  amount: number;
  fund_id: string;
  to_fund_id: string | null;
  category_id: string | null;
  day_of_month: number;
  run_after_salary: boolean;
  next_run_on: string;
  active: boolean;
};

export type Countdown = {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  repeat_yearly: boolean;
  icon: string;
  color: PaletteColor;
  remind_days: number[];
  fund_id: string | null;
  created_at: string;
};

export type CountdownInput = Pick<
  Countdown,
  "title" | "event_date" | "repeat_yearly" | "icon" | "color" | "remind_days" | "fund_id"
>;

/** Dòng của view v_countdowns. */
export type CountdownView = Countdown & {
  next_occurrence: string;
  days_left: number;
  cycle_start: string;
  elapsed_pct: number;
  is_past: boolean;
};

export type MonthSummary = {
  month: string;
  total_expense: number;
  total_income: number;
  total_saved: number;
  by_category: {
    category_id: string;
    name: string;
    icon: string;
    color: PaletteColor;
    amount: number;
    count: number;
  }[];
  by_fund: { fund_id: string; spent: number }[];
};
