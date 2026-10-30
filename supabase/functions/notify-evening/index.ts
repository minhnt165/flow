// Job tổng kết buổi tối: pg_cron gọi mỗi 15 phút, SQL chọn người dùng tới giờ daily_summary_at
// (mặc định 21:00). Nội dung: tổng chi hôm nay theo danh mục, so với trung bình 7 ngày.
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

Deno.serve(async (req) => {
  if (!isCronRequest(req)) return json({ error: "unauthorized" }, 401);

  const { data, error } = await admin.rpc("fn_evening_summaries", { p_now: null });
  if (error) {
    console.error("fn_evening_summaries", error.message);
    return json({ error: error.message }, 500);
  }

  const stats = { sent: 0, skipped: 0, failed: 0 };
  for (const row of (data ?? []) as Row[]) {
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
  return json(stats);
});
