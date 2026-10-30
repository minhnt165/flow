// Nút "Gửi tin thử" ở Cài đặt → Thông báo. Gọi từ web với JWT của người dùng.
import { admin } from "../_lib/admin.ts";
import { sendMessage } from "../_lib/telegram.ts";
import { msg } from "../_shared/messages.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return reply({ error: "unauthorized" }, 401);

  const { data: auth, error } = await admin.auth.getUser(jwt);
  if (error || !auth.user) return reply({ error: "unauthorized" }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("telegram_chat_id, display_name")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile?.telegram_chat_id) return reply({ error: "not_linked" }, 400);

  try {
    await sendMessage(profile.telegram_chat_id, msg.test(profile.display_name ?? "bạn"));
    return reply({ ok: true });
  } catch (e) {
    console.error("telegram-test", (e as Error).message);
    return reply({ error: "send_failed" }, 502);
  }
});
