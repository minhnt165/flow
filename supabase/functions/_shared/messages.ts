// Nội dung tin nhắn Telegram (HTML parse mode, không emoji, tiền dạng 1.000.000 ₫).
// Thuần: dùng cho Edge Functions, cột xem trước ở Cài đặt và test.
import { formatWeekdayShort } from "./dates.ts";
import { formatVND } from "./format.ts";

export type InlineKeyboard = { text: string; callback_data: string }[][];

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const b = (s: string) => `<b>${escapeHtml(s)}</b>`;

export const APP_NAME = "Flow";

export const msg = {
  linked: () =>
    `Đã kết nối với ${APP_NAME}. Nhắn số tiền kèm ghi chú để ghi chi tiêu, ví dụ ${b("65k cơm trưa")}.`,
  unlinked: () => `Đã ngắt kết nối ${APP_NAME}. Gửi /start kèm mã liên kết mới để kết nối lại.`,
  askCode: () =>
    `Gửi mã liên kết 6 ký tự lấy ở ${b("Cài đặt → Thông báo")} trên ${APP_NAME}, ví dụ ${b("/start 7X4K29")}.`,
  badCode: () =>
    "Mã liên kết không đúng hoặc đã hết hạn (10 phút). Tạo mã mới trong Cài đặt rồi thử lại.",
  notLinked: () =>
    `Chat này chưa kết nối với ${APP_NAME}. Gửi /start kèm mã liên kết trong Cài đặt.`,
  disabled: () => `Ghi chi tiêu qua Telegram đang tắt. Bật trong ${b("Cài đặt → Thông báo")}.`,
  help: () =>
    [
      `${b("Ghi chi tiêu")}: số tiền + ghi chú, ví dụ`,
      "• 65k cơm trưa",
      "• cơm trưa 65k",
      "• 820.000 tiền điện",
      "• 1tr2 quà sinh nhật",
      `${b("Ghi thu nhập")}: thêm dấu + ở đầu, ví dụ +22tr lương`,
      "",
      "/stop để ngắt kết nối.",
    ].join("\n"),
  notUnderstood: () =>
    `Chưa hiểu tin nhắn. Gửi số tiền kèm ghi chú, ví dụ ${b("65k cơm trưa")} hoặc ${b("+22tr lương")}. Gõ /help để xem thêm.`,

  logged: (r: {
    type: "expense" | "income";
    amount: number;
    category: string;
    fund: string;
    note?: string | null;
    budget_remaining?: number | null;
    fund_balance?: number | null;
  }) => {
    const lines = [
      r.type === "income"
        ? `Đã ghi thu nhập ${b(formatVND(r.amount))} · ${escapeHtml(r.category)}`
        : `Đã ghi ${b(formatVND(r.amount))} · ${escapeHtml(r.category)}`,
    ];
    if (r.note) lines.push(escapeHtml(r.note));
    lines.push(r.type === "income" ? `Vào quỹ ${escapeHtml(r.fund)}` : `Quỹ ${escapeHtml(r.fund)}`);
    if (r.type === "expense" && r.budget_remaining != null) {
      lines.push(
        r.budget_remaining >= 0
          ? `Ngân sách tháng còn ${b(formatVND(r.budget_remaining))}`
          : `Đã vượt ngân sách tháng ${b(formatVND(-r.budget_remaining))}`,
      );
    } else if (r.fund_balance != null) {
      lines.push(`Số dư quỹ ${b(formatVND(r.fund_balance))}`);
    }
    return lines.join("\n");
  },
  loggedKeyboard: (txId: string): InlineKeyboard => [
    [
      { text: "Đổi danh mục", callback_data: `cat:${txId}` },
      { text: "Xoá", callback_data: `del:${txId}` },
    ],
  ],
  pickCategory: (amount: number) => `Chọn danh mục cho khoản ${b(formatVND(amount))}:`,
  categoryChanged: (amount: number, category: string) =>
    `Đã đổi khoản ${b(formatVND(amount))} sang ${b(category)}.`,
  deleted: (amount: number) => `Đã xoá khoản ${b(formatVND(amount))}.`,
  txGone: () => "Giao dịch này không còn nữa.",

  autoTransfer: (amount: number, toFund: string) =>
    `Đã tự động chuyển ${b(formatVND(amount))} vào ${b(toFund)}.`,

  countdown: (title: string, date: string, daysLeft: number) =>
    daysLeft === 0
      ? `Hôm nay là ${b(title)} · ${formatWeekdayShort(date)}`
      : `Còn ${b(`${daysLeft} ngày`)} đến ${b(title)} · ${formatWeekdayShort(date)}`,

  bill: (name: string, amount: number, due: string, daysLeft: number) =>
    daysLeft === 0
      ? `Hoá đơn ${b(name)} ${b(formatVND(amount))} đến hạn ${b("hôm nay")} · ${formatWeekdayShort(due)}`
      : `Hoá đơn ${b(name)} ${b(formatVND(amount))} đến hạn sau ${daysLeft} ngày · ${formatWeekdayShort(due)}`,
  billKeyboard: (ruleId: string): InlineKeyboard => [
    [{ text: "Đánh dấu đã trả", callback_data: `paid:${ruleId}` }],
  ],
  billPaid: (name: string, amount: number) =>
    `Đã ghi chi ${b(formatVND(amount))} cho hoá đơn ${b(name)}.`,

  budget: (p: { fund: string; pct: number; spent: number; remaining: number; days_left: number }) =>
    [
      p.pct >= 100
        ? `Quỹ ${b(p.fund)} đã dùng hết ngân sách tháng (${Math.round(p.pct)}%).`
        : `Quỹ ${b(p.fund)} đã dùng ${b(`${Math.round(p.pct)}%`)} ngân sách tháng.`,
      `Đã chi ${b(formatVND(p.spent))} · còn ${b(formatVND(Math.max(0, p.remaining)))} · còn ${p.days_left} ngày trong tháng.`,
    ].join("\n"),

  goalBehind: (p: { fund: string; pct: number; per_period: number; deadline: string | null }) =>
    `Quỹ ${b(p.fund)} đang ở ${b(`${Math.round(p.pct)}%`)}, cần góp ${b(formatVND(p.per_period))}/kỳ để kịp${
      p.deadline ? ` hạn ${formatWeekdayShort(p.deadline)}` : ""
    }.`,

  evening: (p: {
    total: number;
    avg7: number;
    by_category: { name: string; amount: number }[];
  }) => {
    if (p.total === 0)
      return `Hôm nay bạn chưa ghi khoản chi nào. Trung bình 7 ngày: ${b(formatVND(p.avg7))}.`;
    const diff = p.avg7 > 0 ? Math.round(((p.total - p.avg7) * 100) / p.avg7) : null;
    const compare =
      diff === null
        ? ""
        : diff === 0
          ? " · bằng trung bình 7 ngày"
          : ` · ${diff > 0 ? "cao" : "thấp"} hơn ${Math.abs(diff)}% so với trung bình 7 ngày (${formatVND(p.avg7)})`;
    const lines = [`Hôm nay bạn chi ${b(formatVND(p.total))}${compare}`];
    for (const c of p.by_category) lines.push(`• ${escapeHtml(c.name)}: ${formatVND(c.amount)}`);
    return lines.join("\n");
  },

  test: (name: string) =>
    `Tin thử từ ${APP_NAME}. Xin chào ${escapeHtml(name)}, bot sẽ nhắc bạn qua đây.`,
};
