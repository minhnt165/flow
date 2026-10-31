-- Người dùng đăng ký TRƯỚC khi chạy migration đầu tiên không có dòng profiles (trigger chưa tồn tại),
-- và backfill ở 20261030000400 chỉ seed cho ai đã có hồ sơ. App vào được nhưng lời chào, Cài đặt → Tài khoản /
-- Thông báo, liên kết Telegram và ngày lương đều trống.
-- 1) Backfill hồ sơ + dữ liệu mặc định cho các tài khoản còn thiếu.
-- 2) RPC ensure_profile() để app tự chữa khi phát hiện thiếu hồ sơ (rồi đưa qua onboarding).

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.profiles (id, display_name)
  select u.id,
         coalesce(
           nullif(u.raw_user_meta_data ->> 'full_name', ''),
           nullif(u.raw_user_meta_data ->> 'name', ''),
           split_part(u.email, '@', 1)
         )
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;

  perform public.seed_user_defaults(v_uid);

  select * into v_profile from public.profiles where id = v_uid;
  return v_profile;
end;
$$;

revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

-- Backfill một lần cho tài khoản đã có nhưng thiếu hồ sơ.
do $$
declare
  u record;
begin
  for u in
    select a.id, a.email, a.raw_user_meta_data
    from auth.users a
    where not exists (select 1 from public.profiles p where p.id = a.id)
  loop
    insert into public.profiles (id, display_name)
    values (
      u.id,
      coalesce(
        nullif(u.raw_user_meta_data ->> 'full_name', ''),
        nullif(u.raw_user_meta_data ->> 'name', ''),
        split_part(u.email, '@', 1)
      )
    )
    on conflict (id) do nothing;
    perform public.seed_user_defaults(u.id);
  end loop;
end;
$$;
