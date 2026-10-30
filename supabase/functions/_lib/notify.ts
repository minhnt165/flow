// Gửi thông báo theo lịch, không lặp trong ngày: ghi notification_log TRƯỚC (unique theo
// user + loại + ref + ngày), chỉ gửi khi ghi được; gửi lỗi thì xoá log để lần chạy sau thử lại.
import { admin } from "./admin.ts";
import { sendMessage } from "./telegram.ts";
import type { InlineKeyboard } from "../_shared/messages.ts";

export async function sendOnce(p: {
  userId: string;
  chatId: number;
  kind: string;
  refId: string | null;
  day: string;
  html: string;
  keyboard?: InlineKeyboard;
}): Promise<"sent" | "skipped" | "failed"> {
  const { data, error } = await admin
    .from("notification_log")
    .upsert(
      { user_id: p.userId, kind: p.kind, ref_id: p.refId, sent_on: p.day },
      { onConflict: "user_id,kind,ref_id,sent_on", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    console.error("notification_log", error.message);
    return "failed";
  }
  const row = (data ?? [])[0] as { id: string } | undefined;
  if (!row) return "skipped";
  try {
    await sendMessage(p.chatId, p.html, p.keyboard);
    return "sent";
  } catch (e) {
    console.error("telegram", p.kind, (e as Error).message);
    await admin.from("notification_log").delete().eq("id", row.id);
    return "failed";
  }
}
