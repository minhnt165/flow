// Webhook bot Telegram: liên kết tài khoản (/start MÃ), /stop, /help, ghi chi tiêu bằng tin nhắn,
// và các nút inline (Đổi danh mục, Xoá, Đánh dấu đã trả). Luôn trả 200 để Telegram không gửi lại.
import { admin } from "../_lib/admin.ts";
import { json } from "../_lib/http.ts";
import { answerCallback, editMessage, sendMessage } from "../_lib/telegram.ts";
import { msg, type InlineKeyboard } from "../_shared/messages.ts";
import { looksLikeLinkCode, parseEntry } from "../_shared/parse-expense.ts";

const SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";

type TgUser = { id: number; username?: string };
type TgMessage = {
  message_id: number;
  date: number;
  text?: string;
  chat: { id: number; type: string };
  from?: TgUser;
};
type TgCallback = { id: string; data?: string; from: TgUser; message?: TgMessage };
type Update = { message?: TgMessage; callback_query?: TgCallback };

type Profile = { id: string };

async function profileByChat(chatId: number): Promise<Profile | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return data as Profile | null;
}

async function link(chatId: number, code: string, username?: string) {
  const { data, error } = await admin.rpc("link_telegram", {
    p_code: code,
    p_chat_id: chatId,
    p_username: username ?? null,
  });
  if (error) throw error;
  await sendMessage(chatId, data ? msg.linked() : msg.badCode());
}

async function onMessage(m: TgMessage) {
  if (m.chat.type !== "private" || !m.text) return;
  const chatId = m.chat.id;
  const text = m.text.trim();

  const command = text.match(/^\/(\w+)(?:@\w+)?\s*(.*)$/s);
  if (command) {
    const [, name, arg] = command;
    switch (name.toLowerCase()) {
      case "start":
        return arg.trim()
          ? link(chatId, arg.trim(), m.from?.username)
          : sendMessage(chatId, msg.askCode());
      case "stop":
        await admin
          .from("profiles")
          .update({ telegram_chat_id: null, telegram_username: null })
          .eq("telegram_chat_id", chatId);
        return sendMessage(chatId, msg.unlinked());
      case "help":
        return sendMessage(chatId, msg.help());
      default:
        return sendMessage(chatId, msg.help());
    }
  }

  const profile = await profileByChat(chatId);
  if (!profile) {
    // Chat chưa liên kết: người dùng có thể gõ thẳng mã thay vì /start MÃ.
    if (looksLikeLinkCode(text)) return link(chatId, text, m.from?.username);
    return sendMessage(chatId, msg.notLinked());
  }

  const entry = parseEntry(text);
  if (!entry) return sendMessage(chatId, msg.notUnderstood());

  const { data, error } = await admin.rpc("fn_telegram_log", {
    p_chat_id: chatId,
    p_type: entry.type,
    p_amount: entry.amount,
    p_note: entry.note,
    p_category_name: entry.category,
    // Giờ giao dịch = giờ Telegram nhận tin.
    p_occurred_at: new Date(m.date * 1000).toISOString(),
  });
  if (error) throw error;
  const res = data as Record<string, unknown> & { status: string; transaction_id?: string };
  if (res.status === "disabled") return sendMessage(chatId, msg.disabled());
  if (res.status !== "ok") return sendMessage(chatId, msg.notLinked());

  await sendMessage(
    chatId,
    msg.logged({
      type: entry.type,
      amount: entry.amount,
      category: String(res.category),
      fund: String(res.fund),
      note: res.note as string | null,
      budget_remaining: res.budget_remaining == null ? null : Number(res.budget_remaining),
      fund_balance: res.fund_balance == null ? null : Number(res.fund_balance),
    }),
    msg.loggedKeyboard(res.transaction_id!),
  );
}

type Tx = { id: string; amount: number; type: "expense" | "income" | "transfer"; user_id: string };

async function categoryKeyboard(tx: Tx): Promise<InlineKeyboard> {
  const { data } = await admin
    .from("categories")
    .select("id, name")
    .eq("user_id", tx.user_id)
    .eq("type", tx.type === "income" ? "income" : "expense")
    .order("sort_order");
  const cats = (data ?? []) as { id: string; name: string }[];
  const rows: InlineKeyboard = [];
  cats.forEach((c, i) => {
    // callback_data tối đa 64 byte: dùng chỉ số danh mục thay vì uuid thứ hai.
    const button = { text: c.name, callback_data: `sc:${tx.id}:${i}` };
    if (i % 2 === 0) rows.push([button]);
    else rows[rows.length - 1].push(button);
  });
  return rows;
}

async function onCallback(cq: TgCallback) {
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;
  if (!chatId || !messageId || !cq.data) return answerCallback(cq.id);

  const profile = await profileByChat(chatId);
  if (!profile) return answerCallback(cq.id, msg.notLinked());

  const [action, id, extra] = cq.data.split(":");

  if (action === "paid") {
    const { data, error } = await admin.rpc("fn_mark_bill_paid", {
      p_rule_id: id,
      p_chat_id: chatId,
    });
    if (error) throw error;
    const r = data as { status: string; name?: string; amount?: number };
    if (r.status === "ok")
      await editMessage(chatId, messageId, msg.billPaid(r.name ?? "", Number(r.amount)));
    return answerCallback(cq.id);
  }

  const { data: txData } = await admin
    .from("transactions")
    .select("id, amount, type, user_id")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  const tx = txData as Tx | null;
  if (!tx) {
    await editMessage(chatId, messageId, msg.txGone());
    return answerCallback(cq.id);
  }

  if (action === "cat") {
    await editMessage(
      chatId,
      messageId,
      msg.pickCategory(Number(tx.amount)),
      await categoryKeyboard(tx),
    );
  } else if (action === "sc") {
    const { data } = await admin
      .from("categories")
      .select("id, name")
      .eq("user_id", tx.user_id)
      .eq("type", tx.type === "income" ? "income" : "expense")
      .order("sort_order");
    const cat = ((data ?? []) as { id: string; name: string }[])[Number(extra)];
    if (cat) {
      const { error } = await admin
        .from("transactions")
        .update({ category_id: cat.id })
        .eq("id", tx.id);
      if (error) throw error;
      await editMessage(
        chatId,
        messageId,
        msg.categoryChanged(Number(tx.amount), cat.name),
        msg.loggedKeyboard(tx.id),
      );
    }
  } else if (action === "del") {
    const { error } = await admin.from("transactions").delete().eq("id", tx.id);
    if (error) throw error;
    await editMessage(chatId, messageId, msg.deleted(Number(tx.amount)));
  }
  return answerCallback(cq.id);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SECRET || req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  let update: Update;
  try {
    update = await req.json();
  } catch {
    return json({ ok: true });
  }
  try {
    if (update.callback_query) await onCallback(update.callback_query);
    else if (update.message) await onMessage(update.message);
  } catch (e) {
    console.error("telegram-webhook", (e as Error).message);
  }
  return json({ ok: true });
});
