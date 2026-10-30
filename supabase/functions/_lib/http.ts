export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Job theo lịch: pg_cron gửi header x-cron-secret khớp với secret CRON_SECRET. */
export function isCronRequest(req: Request) {
  const secret = Deno.env.get("CRON_SECRET");
  return Boolean(secret) && req.headers.get("x-cron-secret") === secret;
}

export const APP_URL = Deno.env.get("APP_URL") ?? "";
