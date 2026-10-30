// Kiểu dữ liệu khớp schema trong supabase/migrations. Tiền là numeric(14,0) → number nguyên trong JS.

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
