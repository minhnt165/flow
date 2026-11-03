// Kiểu dữ liệu khớp schema trong supabase/migrations. Tiền là numeric(14,0) → number nguyên trong JS.
// Khi đã link project thật có thể sinh lại bằng `pnpm db:types` để đối chiếu.

export type PaletteColor =
  "sky" | "orange" | "green" | "violet" | "pink" | "red" | "yellow" | "slate";
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
  expense_reminder_at: string | null;
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
    | "expense_reminder_at"
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
  /** Số dư lúc tạo quỹ, cộng vào balance; không phải giao dịch. */
  opening_balance: number;
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
  | "opening_balance"
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
  per_period: number | null;
  expected_pct: number | null;
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
  /** Chu kỳ hoá đơn theo tháng (1, 2, 3, 6, 12); quy tắc chuyển quỹ luôn 1. */
  interval_months: number;
  run_after_salary: boolean;
  next_run_on: string;
  active: boolean;
};

/** Hoá đơn định kỳ = recurring_rules kind 'bill'. */
export type BillInput = {
  name: string;
  amount: number;
  fund_id: string;
  category_id: string | null;
  day_of_month: number;
  /** Chu kỳ theo tháng: 1, 2, 3, 6, 12. */
  interval_months: number;
  /** Hạn tới; client tính bằng dueDateOnOrAfter khi tạo hoặc đổi ngày. */
  next_run_on: string;
  active: boolean;
};

/** Dòng của view v_bills. */
export type BillView = BillInput & {
  id: string;
  user_id: string;
  created_at: string;
  today: string;
  /** Âm = quá hạn. */
  days_left: number;
  last_paid_at: string | null;
  last_paid_amount: number | null;
  paid_this_month: boolean;
};

export type PayBillResult = { transaction_id: string; amount: number; next_run_on: string };

export type Countdown = {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  /** Chu kỳ lặp theo tháng (1, 2, 3, 6, 12); null = không lặp. */
  repeat_months: number | null;
  /** Dẫn xuất từ repeat_months (= 12), chỉ đọc. */
  repeat_yearly: boolean;
  icon: string;
  color: PaletteColor;
  remind_days: number[];
  fund_id: string | null;
  created_at: string;
};

export type CountdownInput = Pick<
  Countdown,
  "title" | "event_date" | "repeat_months" | "icon" | "color" | "remind_days" | "fund_id"
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

/** Một dòng của fn_monthly_totals: tổng chi / thu của một tháng. */
export type MonthlyTotal = { month_start: string; expense: number; income: number };

/** Việc cần làm. Hạn tuỳ chọn; done_at null = chưa xong. */
export type Todo = {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  due_on: string | null;
  done_at: string | null;
  created_at: string;
};

export type TodoInput = Pick<Todo, "title" | "note" | "due_on">;

/** Dòng của view v_todos. */
export type TodoView = Todo & {
  today: string;
  /** null = không hạn; âm = quá hạn. */
  days_left: number | null;
  done: boolean;
};

/** Thói quen: mục tiêu số ngày mỗi tuần (1–7), đánh dấu theo ngày trong habit_logs. */
export type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: PaletteColor;
  target_per_week: number;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
};

export type HabitInput = Pick<Habit, "name" | "icon" | "color" | "target_per_week">;

/** Dòng của view v_habits. */
export type HabitView = Habit & {
  today: string;
  done_today: boolean;
  /** Chuỗi ngày liên tiếp tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa đánh dấu). */
  streak: number;
  /** Số ngày đã làm trong tuần này (thứ Hai → Chủ nhật). */
  week_count: number;
  total_count: number;
  /** 7 ngày gần nhất, phần tử cuối là hôm nay. */
  last7: boolean[];
};

/** Ghi chú tự do: tiêu đề hoặc nội dung phải có ít nhất một. */
export type Note = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  pinned: boolean;
  updated_at: string;
  created_at: string;
};

export type NoteInput = Pick<Note, "title" | "body" | "pinned">;

/** Mục tiêu không gắn tiền: thời gian bắt đầu, hạn tuỳ chọn, số buổi mỗi tuần, kết quả đầu ra. */
export type Objective = {
  id: string;
  user_id: string;
  title: string;
  why: string | null;
  icon: string;
  color: PaletteColor;
  start_on: string;
  end_on: string | null;
  /** null = không đặt nhịp. */
  sessions_per_week: number | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
};

export type ObjectiveInput = Pick<
  Objective,
  "title" | "why" | "icon" | "color" | "start_on" | "end_on" | "sessions_per_week"
>;

/** Dòng của view v_objectives. */
export type ObjectiveView = Objective & {
  today: string;
  done_today: boolean;
  /** Số buổi đã làm trong tuần này (thứ Hai → hôm nay). */
  week_count: number;
  total_sessions: number;
  outputs_total: number;
  outputs_done: number;
  /** Chưa xong và hạn trước hôm nay. */
  outputs_overdue: number;
};

/** Kết quả đầu ra của một mục tiêu; done_at null = chưa xong. */
export type ObjectiveOutput = {
  id: string;
  user_id: string;
  objective_id: string;
  title: string;
  due_on: string | null;
  done_at: string | null;
  sort_order: number;
  created_at: string;
};

export type ObjectiveOutputInput = Pick<ObjectiveOutput, "objective_id" | "title" | "due_on"> & {
  sort_order?: number;
};
