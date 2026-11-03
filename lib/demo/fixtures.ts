// Dữ liệu mẫu cho chế độ demo (NEXT_PUBLIC_DEMO_MODE=1), bám theo thiết kế tham chiếu.
import { addDays, addMonths, APP_TZ, localDate, monthStart, toIso } from "@/lib/dates";
import type {
  Category,
  Countdown,
  Fund,
  Habit,
  Note,
  Objective,
  ObjectiveOutput,
  Profile,
  RecurringRule,
  Todo,
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
    expense_reminder_at: "20:00:00",
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
      repeat_months: null,
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
      repeat_months: 12,
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
      repeat_months: 12,
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
      repeat_months: null,
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
      repeat_months: null,
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
    opening_balance: 0,
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
  // Chi các tháng trước (biểu đồ cột "Chi theo tháng").
  [-5, -4, -3, -2, -1].forEach((k, i) => {
    const m = addMonths(m0, k);
    transactions.push(
      tx({
        type: "expense",
        amount: [5_800_000, 7_100_000, 6_300_000, 8_900_000, 6_750_000][i],
        fund_id: living.id,
        category_id: c("Ăn uống"),
        note: "Chi tiêu trong tháng",
        occurred_at: at(addDays(m, 14), "12:00"),
      }),
      tx({
        type: "expense",
        amount: [930_000, 980_000, 910_000, 1_250_000, 940_000][i],
        fund_id: living.id,
        category_id: c("Hoá đơn"),
        note: "Điện + Internet",
        occurred_at: at(addDays(m, 9), "08:30"),
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
      interval_months: 1,
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
      interval_months: 1,
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
      interval_months: 3,
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
      interval_months: 1,
      run_after_salary: false,
      next_run_on: addDays(today, 13),
      active: true,
    },
  ];

  const todo = (title: string, due: string | null, extra: Partial<Todo> = {}): Todo => ({
    id: id("todo"),
    user_id: uid,
    title,
    note: null,
    due_on: due,
    done_at: null,
    created_at: created,
    ...extra,
  });
  const todos: Todo[] = [
    todo("Đổi dầu xe", addDays(today, -2), { note: "Garage Minh Phát, 0909 123 456" }),
    todo("Nộp báo cáo tuần", today),
    todo("Gọi điện cho mẹ", today),
    todo("Đặt vé xe về quê Tết", addDays(today, 5)),
    todo("Khám răng định kỳ", addDays(today, 20)),
    todo("Đọc xong 'Tiền không mua được gì'", null),
    todo("Dọn tủ quần áo", null, { done_at: at(addDays(today, -1), "20:15") }),
  ];

  const habit = (name: string, icon: string, color: Habit["color"], target: number): Habit => ({
    id: id("habit"),
    user_id: uid,
    name,
    icon,
    color,
    target_per_week: target,
    sort_order: 0,
    archived_at: null,
    created_at: at(addDays(today, -40), "08:00"),
  });
  const habits: Habit[] = [
    habit("Uống 2 lít nước", "droplets", "sky", 7),
    habit("Tập gym", "dumbbell", "orange", 4),
    habit("Đọc sách 20 phút", "book-open", "violet", 5),
    habit("Ngủ trước 23h", "bed", "green", 7),
  ];
  // Log theo ngày: (chỉ số thói quen, số ngày trước hôm nay)
  const habitLogs: { habit_id: string; day: string }[] = [];
  const log = (i: number, daysAgo: number[]) =>
    daysAgo.forEach((n) => habitLogs.push({ habit_id: habits[i].id, day: addDays(today, -n) }));
  log(0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  log(1, [1, 3, 5, 8, 10]);
  log(2, [0, 1, 2, 4, 6]);
  log(3, [2, 5]);

  const note = (title: string, body: string, pinned: boolean, daysAgo: number): Note => ({
    id: id("note"),
    user_id: uid,
    title,
    body,
    pinned,
    updated_at: at(addDays(today, -daysAgo), "19:30"),
    created_at: at(addDays(today, -daysAgo - 3), "08:00"),
  });
  const notes: Note[] = [
    note("Wifi nhà", "Tên: Flow_5G\nMật khẩu: giu-nhip-2026", true, 12),
    note(
      "Danh sách mua cuối tuần",
      "- Sữa tươi 2 hộp\n- Trứng gà 1 vỉ\n- Rau cải, cà chua\n- Bánh mì sandwich\n- Nước giặt",
      false,
      1,
    ),
    note(
      "",
      "Ý tưởng quà sinh nhật mẹ: khăn lụa, sách nấu ăn, một buổi đi chụp ảnh gia đình.",
      false,
      4,
    ),
    note(
      "Số điện thoại hay dùng",
      "Garage Minh Phát: 0909 123 456\nSửa điện nước: 0912 555 777",
      false,
      20,
    ),
  ];

  const objective = (
    title: string,
    icon: string,
    color: Objective["color"],
    startAgo: number,
    endIn: number | null,
    per: number | null,
    why: string | null,
  ): Objective => ({
    id: id("objective"),
    user_id: uid,
    title,
    why,
    icon,
    color,
    start_on: addDays(today, -startAgo),
    end_on: endIn === null ? null : addDays(today, endIn),
    sessions_per_week: per,
    completed_at: null,
    sort_order: 0,
    created_at: at(addDays(today, -Math.max(startAgo, 0)), "08:00"),
  });
  const objectives: Objective[] = [
    objective("Học Java", "laptop", "violet", 15, 54, 3, "Chuyển sang làm backend trong năm sau."),
    objective("IELTS 6.5", "languages", "sky", 40, 140, 4, null),
    objective("Chạy được 10km", "footprints", "green", -5, null, 3, null),
  ];
  // Buổi đã làm: (chỉ số mục tiêu, số ngày trước hôm nay)
  const objectiveSessions: { objective_id: string; day: string }[] = [];
  const session = (i: number, daysAgo: number[]) =>
    daysAgo.forEach((n) =>
      objectiveSessions.push({ objective_id: objectives[i].id, day: addDays(today, -n) }),
    );
  session(0, [1, 3, 5, 8, 10, 12, 14]);
  session(1, [2, 4, 6, 9, 13, 20, 22, 27, 30, 35]);
  const output = (i: number, title: string, dueIn: number | null, doneAgo: number | null) => {
    const o: ObjectiveOutput = {
      id: id("output"),
      user_id: uid,
      objective_id: objectives[i].id,
      title,
      due_on: dueIn === null ? null : addDays(today, dueIn),
      done_at: doneAgo === null ? null : at(addDays(today, -doneAgo), "21:00"),
      sort_order: 0,
      created_at: objectives[i].created_at,
    };
    return o;
  };
  const objectiveOutputs: ObjectiveOutput[] = [
    output(0, "Cài JDK + IntelliJ, viết Hello World", -12, 13),
    output(0, "Xong phần OOP cơ bản", -2, 3),
    output(0, "Project CRUD với Spring Boot", 30, null),
    output(0, "Deploy project lên server", 54, null),
    output(1, "Thi thử đạt 5.5", -5, null),
    output(1, "Thi thử đạt 6.5", 120, null),
  ];

  return {
    profile,
    categories,
    funds,
    transactions,
    countdowns,
    rules,
    todos,
    habits,
    habitLogs,
    notes,
    objectives,
    objectiveOutputs,
    objectiveSessions,
  };
}

export type Fixtures = ReturnType<typeof buildFixtures>;
