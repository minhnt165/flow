-- pglite:skip (cần pg_cron, pg_net và Vault của Supabase)
-- Lịch chạy job. pg_cron gọi Edge Function qua pg_net, kèm header x-cron-secret.
-- Trước khi job chạy được, tạo 2 secret trong Vault (xem docs/SETUP.md):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<cron secret>', 'cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_edge_function(p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_url is null or v_secret is null then
    raise warning 'Thiếu Vault secret project_url hoặc cron_secret, bỏ qua %', p_name;
    return null;
  end if;
  return net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

revoke execute on function public.invoke_edge_function(text) from public, anon, authenticated;

-- 06:00 giờ Việt Nam = 23:00 UTC hôm trước.
select cron.schedule('run-recurring', '0 23 * * *', $$select public.invoke_edge_function('run-recurring')$$);
