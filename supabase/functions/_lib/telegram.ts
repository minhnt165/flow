// Gọi Telegram Bot API. Token chỉ đọc từ Supabase secrets, không bao giờ in ra log.
import type { InlineKeyboard } from "../_shared/messages.ts";

const API = `https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN") ?? ""}`;

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
  if (!json.ok) throw new Error(`telegram ${method}: ${json.description ?? "lỗi không rõ"}`);
  return json.result as T;
}

export function sendMessage(chatId: number, html: string, keyboard?: InlineKeyboard) {
  return call("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export function editMessage(
  chatId: number,
  messageId: number,
  html: string,
  keyboard?: InlineKeyboard,
) {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: html,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: keyboard ?? [] },
  });
}

export function answerCallback(id: string, text?: string) {
  return call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}
