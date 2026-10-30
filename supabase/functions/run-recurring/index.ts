// Job 06:00 giờ VN (pg_cron 0 23 * * * UTC): chạy các quy tắc chuyển quỹ đến hạn / sau lương,
// rồi báo qua Telegram "Đã tự động chuyển 1.000.000 ₫ vào Quỹ Tết".
import { admin } from "../_lib/admin.ts";
import { isCronRequest, json } from "../_lib/http.ts";
import { sendMessage } from "../_lib/telegram.ts";
import { msg } from "../_shared/messages.ts";

type Ran = {
  user_id: string;
  telegram_chat_id: number | null;
  rule_id: string;
  transaction_id: string;
  amount: number;
  from_fund: string;
  to_fund: string;
};

Deno.serve(async (req) => {
  if (!isCronRequest(req)) return json({ error: "unauthorized" }, 401);

  const { data, error } = await admin.rpc("fn_run_recurring", { p_now: null });
  if (error) {
    console.error("fn_run_recurring", error.message);
    return json({ error: error.message }, 500);
  }

  const rows = (data ?? []) as Ran[];
  let sent = 0;
  for (const r of rows) {
    if (!r.telegram_chat_id) continue;
    try {
      await sendMessage(r.telegram_chat_id, msg.autoTransfer(Number(r.amount), r.to_fund));
      sent += 1;
    } catch (e) {
      console.error("telegram", r.rule_id, (e as Error).message);
    }
  }
  return json({ ran: rows.length, sent });
});
