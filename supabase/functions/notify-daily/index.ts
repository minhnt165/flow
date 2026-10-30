// Job 08:00 giờ VN (pg_cron 0 1 * * * UTC): countdown khớp remind_days, hoá đơn sắp đến hạn,
// ngân sách vượt 80% / 100%, quỹ mục tiêu chậm tiến độ. Mỗi loại không gửi lặp trong ngày.
import { admin } from "../_lib/admin.ts";
import { isCronRequest, json } from "../_lib/http.ts";
import { sendOnce } from "../_lib/notify.ts";
import { msg, type InlineKeyboard } from "../_shared/messages.ts";

type Row = {
  user_id: string;
  telegram_chat_id: number;
  kind: string;
  ref_id: string | null;
  today: string;
  payload: Record<string, unknown>;
};

function render(r: Row): { html: string; keyboard?: InlineKeyboard } | null {
  const p = r.payload;
  switch (r.kind) {
    case "countdown":
      return { html: msg.countdown(String(p.title), String(p.date), Number(p.days_left)) };
    case "bill":
      return {
        html: msg.bill(String(p.name), Number(p.amount), String(p.due), Number(p.days_left)),
        keyboard: msg.billKeyboard(r.ref_id!),
      };
    case "budget_80":
    case "budget_100":
      return {
        html: msg.budget({
          fund: String(p.fund),
          pct: Number(p.pct),
          spent: Number(p.spent),
          remaining: Number(p.remaining),
          days_left: Number(p.days_left),
        }),
      };
    case "goal_behind":
      return {
        html: msg.goalBehind({
          fund: String(p.fund),
          pct: Number(p.pct),
          per_period: Number(p.per_period),
          deadline: (p.deadline as string | null) ?? null,
        }),
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (!isCronRequest(req)) return json({ error: "unauthorized" }, 401);

  const { data, error } = await admin.rpc("fn_daily_notifications", { p_now: null });
  if (error) {
    console.error("fn_daily_notifications", error.message);
    return json({ error: error.message }, 500);
  }

  const stats = { sent: 0, skipped: 0, failed: 0 };
  for (const row of (data ?? []) as Row[]) {
    const content = render(row);
    if (!content) continue;
    const result = await sendOnce({
      userId: row.user_id,
      chatId: row.telegram_chat_id,
      kind: row.kind,
      refId: row.ref_id,
      day: row.today,
      ...content,
    });
    stats[result] += 1;
  }
  return json(stats);
});
