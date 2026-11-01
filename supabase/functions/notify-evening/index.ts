// Job tổng kết buổi tối: pg_cron gọi mỗi 15 phút, SQL chọn người dùng tới giờ daily_summary_at
// (mặc định 21:00). Nội dung: tổng chi hôm nay theo danh mục, so với trung bình 7 ngày.
// Cùng lượt chạy gửi luôn lời nhắc ghi chi tiêu cho người tới giờ expense_reminder_at (mặc định 20:00).
import { admin } from "../_lib/admin.ts";
import { isCronRequest, json } from "../_lib/http.ts";
import { sendOnce } from "../_lib/notify.ts";
import { msg } from "../_shared/messages.ts";

type Row = {
  user_id: string;
  telegram_chat_id: number;
  today: string;
  payload: { total: number; avg7: number; by_category: { name: string; amount: number }[] };
};

type ReminderRow = {
  user_id: string;
  telegram_chat_id: number;
  today: string;
  payload: { count: number; total: number; can_log: boolean };
};

Deno.serve(async (req) => {
  if (!isCronRequest(req)) return json({ error: "unauthorized" }, 401);

  const [summaries, reminders] = await Promise.all([
    admin.rpc("fn_evening_summaries", { p_now: null }),
    admin.rpc("fn_expense_reminders", { p_now: null }),
  ]);
  if (summaries.error) {
    console.error("fn_evening_summaries", summaries.error.message);
    return json({ error: summaries.error.message }, 500);
  }
  // Lời nhắc lỗi (vd. chưa chạy migration expense_reminder) không được chặn tổng kết tối.
  if (reminders.error) console.error("fn_expense_reminders", reminders.error.message);

  const stats = { sent: 0, skipped: 0, failed: reminders.error ? 1 : 0 };
  for (const row of (summaries.data ?? []) as Row[]) {
    const p = row.payload;
    const result = await sendOnce({
      userId: row.user_id,
      chatId: row.telegram_chat_id,
      kind: "evening",
      refId: null,
      day: row.today,
      html: msg.evening({
        total: Number(p.total),
        avg7: Number(p.avg7),
        by_category: p.by_category.map((c) => ({ name: c.name, amount: Number(c.amount) })),
      }),
    });
    stats[result] += 1;
  }
  for (const row of (reminders.data ?? []) as ReminderRow[]) {
    const p = row.payload;
    const result = await sendOnce({
      userId: row.user_id,
      chatId: row.telegram_chat_id,
      kind: "expense_reminder",
      refId: null,
      day: row.today,
      html: msg.expenseReminder({
        count: Number(p.count),
        total: Number(p.total),
        can_log: p.can_log,
      }),
    });
    stats[result] += 1;
  }
  return json(stats);
});
