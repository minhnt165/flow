// Dữ liệu mẫu cho chế độ demo (NEXT_PUBLIC_DEMO_MODE=1), bám theo thiết kế tham chiếu.
import { addDays, addMonths, APP_TZ, localDate, monthStart, toIso } from "@/lib/dates";
import type {
  Category,
  Countdown,
  Fund,
  Profile,
  RecurringRule,
  Transaction,
} from "@/lib/supabase/types";

export const DEMO_USER = { id: "00000000-0000-4000-8000-000000000001", email: "demo@flow.local" };

let seq = 0;
const id = (p: string) => `${p}-${String(++seq).padStart(4, "0")}-demo`;

export function buildFixtures() {
  seq = 0;
  const today = localDate(new Date(), APP_TZ);
  const m0 = monthStart(today);
  const at = (day: string, time: string) => toIso(day, time);
  const uid = DEMO_USER.id;
  const created = new Date().toISOString();

  const profile: Profile = {
    id: uid,
    display_name: "Minh",
    salary_day: 5,
    telegram_chat_id: 123456789,
    telegram_username: "minh_nguyen",
    notify_bills: true,
    notify_countdowns: true,
    notify_budget: true,
    daily_summary_at: "21:00:00",
    telegram_log_expense: true,
    timezone: APP_TZ,
    created_at: created,
  };

  const cat = (
    name: string,
    icon: string,
    color: Category["color"],
    type: Category["type"],
    sort: number,
  ): Category => ({
    id: id("cat"),
    user_id: uid,
    name,
    icon,
    color,
    type,
    sort_order: sort,
  });
  const categories: Category[] = [
    cat("Ăn uống", "utensils", "sky", "expense", 0),
    cat("Đi lại", "car", "violet", "expense", 1),
    cat("Mua sắm", "shopping-bag", "orange", "expense", 2),
    cat("Hoá đơn", "zap", "green", "expense", 3),
    cat("Giải trí", "clapperboard", "pink", "expense", 4),
    cat("Sức khoẻ", "heart-pulse", "red", "expense", 5),
    cat("Giáo dục", "graduation-cap", "yellow", "expense", 6),
    cat("Khác", "circle-ellipsis", "slate", "expense", 7),
    cat("Lương", "banknote", "green", "income", 0),
    cat("Thưởng", "gift", "yellow", "income", 1),
    cat("Khác", "circle-ellipsis", "slate", "income", 2),
  ];
  const c = (name: string, type: Category["type"] = "expense") =>
    categories.find((x) => x.name === name && x.type === type)!.id;

  const tetDate = addDays(today, 99);
  const countdowns: Countdown[] = [
    {
      id: id("cd"),
      user_id: uid,
      title: "Tết Nguyên Đán 2027",
      event_date: tetDate,
      repeat_yearly: false,
      icon: "sparkles",
      color: "pink",
      remind_days: [0, 1, 3, 7],
      fund_id: null,
      created_at: toIso(addMonths(today, -5), "09:00"),
    },
    {
      id: id("cd"),
      user_id: uid,
      title: "Sinh nhật mẹ",
      event_date: addDays(today, 12),
      repeat_yearly: true,
      icon: "cake",
      color: "orange",
      remind_days: [0, 1, 3],
      fund_id: null,
      created_at: toIso(addMonths(today, -10), "09:00"),
    },
    {
      id: id("cd"),
      user_id: uid,
      title: "Kỷ niệm 5 năm",
      event_date: addDays(today, 41),
      repeat_yearly: true,
      icon: "heart",
      color: "red",
      remind_days: [0, 7],
      fund_id: null,
      created_at: toIso(addMonths(today, -8), "09:00"),
    },
    {
      id: id("cd"),
      user_id: uid,
      title: "Thi IELTS",
      event_date: addDays(today, 63),
      repeat_yearly: false,
      icon: "graduation-cap",
      color: "violet",
      remind_days: [1, 7],
      fund_id: null,
      created_at: toIso(addMonths(today, -1), "09:00"),
    },
    {
      id: id("cd"),
      user_id: uid,
      title: "Du lịch Đà Lạt",
      event_date: addDays(today, -20),
      repeat_yearly: false,
      icon: "plane",
      color: "sky",
      remind_days: [0, 1],
      fund_id: null,
      created_at: toIso(addMonths(today, -3), "09:00"),
    },
  ];

  const fund = (f: Partial<Fund> & Pick<Fund, "name" | "icon" | "color" | "kind">): Fund => ({
    id: id("fund"),
    user_id: uid,
    monthly_budget: null,
    target_amount: null,
    target_date: null,
    countdown_id: null,
    auto_contribution: null,
    auto_from_fund_id: null,
    is_default: false,
    sort_order: 0,
    archived_at: null,
    created_at: toIso(addMonths(today, -5), "09:00"),
    ...f,
  });
  const living = fund({
    name: "Sinh hoạt",
    icon: "wallet",
    color: "sky",
    kind: "monthly_budget",
    monthly_budget: 12_000_000,
    is_default: true,
  });
  const savings = fund({
    name: "Tiết kiệm",
    icon: "piggy-bank",
    color: "green",
    kind: "goal",
    target_amount: 100_000_000,
    sort_order: 1,
  });
  const tet = fund({
    name: "Quỹ Tết 2027",
    icon: "gift",
    color: "pink",
    kind: "goal",
    target_amount: 15_000_000,
    countdown_id: countdowns[0].id,
    auto_contribution: 1_000_000,
    sort_order: 2,
  });
  tet.auto_from_fund_id = living.id;
  countdowns[0].fund_id = tet.id;
  const emergency = fund({
    name: "Khẩn cấp",
    icon: "shield",
    color: "orange",
    kind: "goal",
    target_amount: 10_000_000,
    sort_order: 3,
  });
  const funds = [living, savings, tet, emergency];

  const tx = (
    t: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "fund_id" | "occurred_at">,
  ): Transaction => ({
    id: id("tx"),
    user_id: uid,
    to_fund_id: null,
    category_id: null,
    note: null,
    source: "web",
    recurring_rule_id: null,
    created_at: created,
    ...t,
  });

  const transactions: Transaction[] = [];
  // Số dư đầu kỳ của các quỹ tiết kiệm.
  transactions.push(
    tx({
      type: "income",
      amount: 29_000_000,
      fund_id: savings.id,
      category_id: c("Khác", "income"),
      note: "Số dư mang sang",
      occurred_at: at(addMonths(m0, -5), "08:00"),
    }),
  );
  transactions.push(
    tx({
      type: "income",
      amount: 10_000_000,
      fund_id: emergency.id,
      category_id: c("Khác", "income"),
      note: "Số dư mang sang",
      occurred_at: at(addMonths(m0, -5), "08:00"),
    }),
  );
  // Góp Tết các tháng trước.
  [-4, -3, -2, -1].forEach((k, i) => {
    const day = addDays(addMonths(m0, k), 4);
    transactions.push(
      tx({
        type: "transfer",
        amount: [1_000_000, 1_000_000, 1_500_000, 1_000_000][i],
        fund_id: living.id,
        to_fund_id: tet.id,
        note: "Tự động sau lương",
        source: "auto",
        occurred_at: at(day, "09:10"),
      }),
    );
  });
  // Tháng này.
  const d = (n: number) => (addDays(m0, n) <= today ? addDays(m0, n) : today);
  transactions.push(
    tx({
      type: "income",
      amount: 22_000_000,
      fund_id: living.id,
      category_id: c("Lương", "income"),
      note: "Lương tháng này",
      occurred_at: at(d(4), "09:02"),
    }),
    tx({
      type: "income",
      amount: 3_000_000,
      fund_id: savings.id,
      category_id: c("Thưởng", "income"),
      note: "Dự án freelance",
      occurred_at: at(d(17), "20:15"),
    }),
    tx({
      type: "transfer",
      amount: 1_000_000,
      fund_id: living.id,
      to_fund_id: tet.id,
      note: "Tự động sau lương",
      source: "auto",
      occurred_at: at(d(5), "06:00"),
    }),
    tx({
      type: "transfer",
      amount: 1_000_000,
      fund_id: living.id,
      to_fund_id: tet.id,
      note: "Thưởng dự án, góp thêm",
      occurred_at: at(d(20), "21:00"),
    }),
    tx({
      type: "expense",
      amount: 2_400_000,
      fund_id: living.id,
      category_id: c("Mua sắm"),
      note: "Đồ gia dụng",
      occurred_at: at(d(9), "18:40"),
    }),
    tx({
      type: "expense",
      amount: 2_400_000,
      fund_id: living.id,
      category_id: c("Ăn uống"),
      note: "Đi chợ cả tháng",
      occurred_at: at(d(6), "10:00"),
    }),
    tx({
      type: "expense",
      amount: 930_000,
      fund_id: living.id,
      category_id: c("Hoá đơn"),
      note: "Internet + nước",
      occurred_at: at(d(10), "08:30"),
    }),
    tx({
      type: "expense",
      amount: 1_052_000,
      fund_id: living.id,
      category_id: c("Đi lại"),
      note: "Xăng + gửi xe",
      occurred_at: at(d(12), "07:30"),
    }),
    tx({
      type: "expense",
      amount: 735_000,
      fund_id: living.id,
      category_id: c("Ăn uống"),
      note: "Cà phê với team",
      occurred_at: at(d(15), "15:00"),
    }),
    tx({
      type: "expense",
      amount: 890_000,
      fund_id: living.id,
      category_id: c("Mua sắm"),
      note: "Áo khoác mùa đông",
      occurred_at: at(addDays(today, -2), "19:20"),
    }),
    tx({
      type: "expense",
      amount: 48_000,
      fund_id: living.id,
      category_id: c("Đi lại"),
      note: "Grab đi làm",
      occurred_at: at(addDays(today, -1), "07:48"),
    }),
    tx({
      type: "expense",
      amount: 820_000,
      fund_id: living.id,
      category_id: c("Hoá đơn"),
      note: "Tiền điện tháng này",
      occurred_at: at(today, "09:05"),
    }),
    tx({
      type: "expense",
      amount: 65_000,
      fund_id: living.id,
      category_id: c("Ăn uống"),
      note: "Cơm trưa văn phòng",
      source: "telegram",
      occurred_at: at(today, "12:31"),
    }),
  );

  const rules: RecurringRule[] = [
    {
      id: id("rule"),
      user_id: uid,
      kind: "transfer",
      name: tet.name,
      amount: 1_000_000,
      fund_id: living.id,
      to_fund_id: tet.id,
      category_id: null,
      day_of_month: 5,
      run_after_salary: true,
      next_run_on: addDays(addMonths(m0, 1), 4),
      active: true,
    },
    {
      id: id("rule"),
      user_id: uid,
      kind: "transfer",
      name: savings.name,
      amount: 5_000_000,
      fund_id: living.id,
      to_fund_id: savings.id,
      category_id: null,
      day_of_month: 5,
      run_after_salary: true,
      next_run_on: addDays(addMonths(m0, 1), 4),
      active: true,
    },
    {
      id: id("rule"),
      user_id: uid,
      kind: "bill",
      name: "Tiền nhà",
      amount: 4_500_000,
      fund_id: living.id,
      to_fund_id: null,
      category_id: c("Hoá đơn"),
      day_of_month: 5,
      run_after_salary: false,
      next_run_on: addDays(today, 6),
      active: true,
    },
    {
      id: id("rule"),
      user_id: uid,
      kind: "bill",
      name: "Netflix",
      amount: 260_000,
      fund_id: living.id,
      to_fund_id: null,
      category_id: c("Giải trí"),
      day_of_month: 12,
      run_after_salary: false,
      next_run_on: addDays(today, 13),
      active: true,
    },
  ];

  return { profile, categories, funds, transactions, countdowns, rules };
}

export type Fixtures = ReturnType<typeof buildFixtures>;
