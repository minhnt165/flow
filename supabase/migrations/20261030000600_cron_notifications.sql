-- pglite:skip (cần pg_cron, pg_net và Vault của Supabase)
-- Lịch gửi thông báo Telegram (dùng public.invoke_edge_function ở migration trước).

-- 08:00 giờ Việt Nam = 01:00 UTC.
select cron.schedule('notify-daily', '0 1 * * *', $$select public.invoke_edge_function('notify-daily')$$);

-- Mỗi 15 phút; SQL tự chọn người dùng tới giờ tổng kết (daily_summary_at).
select cron.schedule('notify-evening', '*/15 * * * *', $$select public.invoke_edge_function('notify-evening')$$);
