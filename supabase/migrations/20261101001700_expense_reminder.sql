-- Nhắc ghi chi tiêu mỗi ngày qua Telegram, lúc expense_reminder_at (mặc định 20:00, null = tắt).
-- Job notify-evening (mỗi 15 phút) gọi thêm fn_expense_reminders, không cần lịch pg_cron mới.

alter table public.profiles add column expense_reminder_at time default '20:00';

comment on column public.profiles.expense_reminder_at is 'Giờ nhắc ghi chi tiêu mỗi ngày; null = tắt.';

grant update (expense_reminder_at) on public.profiles to authenticated;

-- Người dùng tới giờ nhắc, kèm số khoản chi và tổng chi đã ghi hôm nay; can_log = có ghi được
-- ngay trong Telegram không (telegram_log_expense) để tin nhắn chỉ gợi ý cú pháp khi dùng được.
create or replace function public.fn_expense_reminders(p_now timestamptz default null)
returns table (
  user_id uuid,
  telegram_chat_id bigint,
  today date,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if p_now is not null then
    perform set_config('app.now', p_now::text, true);
  end if;

  return query
  with users as (
    select p.*, public.fn_today(p.id) as d, public.fn_user_tz(p.id) as tz,
           (public.fn_now() at time zone public.fn_user_tz(p.id))::time as local_time
    from public.profiles p
    where p.telegram_chat_id is not null and p.expense_reminder_at is not null
  )
  select
    u.id,
    u.telegram_chat_id,
    u.d,
    (
      select jsonb_build_object(
        'count', count(*),
        'total', coalesce(sum(t.amount), 0),
        'can_log', u.telegram_log_expense
      )
      from public.transactions t
      where t.user_id = u.id and t.type = 'expense'
        and t.occurred_at >= public.fn_local_start(u.d, u.tz)
        and t.occurred_at < public.fn_local_start(u.d + 1, u.tz)
    )
  from users u
  where u.local_time >= u.expense_reminder_at
    and u.local_time < u.expense_reminder_at + interval '15 minutes'
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = u.id and l.kind = 'expense_reminder' and l.sent_on = u.d
    );
end;
$$;

revoke execute on function public.fn_expense_reminders(timestamptz) from public, anon, authenticated;
grant execute on function public.fn_expense_reminders(timestamptz) to service_role;
