-- Hồ sơ người dùng: một dòng cho mỗi auth.users, tạo tự động bằng trigger.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  salary_day int check (salary_day between 1 and 31),
  telegram_chat_id bigint unique,
  telegram_username text,
  notify_bills boolean not null default true,
  notify_countdowns boolean not null default true,
  notify_budget boolean not null default true,
  daily_summary_at time default '21:00',
  telegram_log_expense boolean not null default true,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.salary_day is 'Ngày nhận lương trong tháng; tháng ngắn hơn thì lấy ngày cuối tháng.';
comment on column public.profiles.daily_summary_at is 'Giờ gửi tổng kết buổi tối; null = tắt.';

alter table public.profiles enable row level security;

create policy "profiles: đọc hồ sơ của mình" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles: sửa hồ sơ của mình" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Liên kết Telegram chỉ đổi qua webhook (service role) hoặc RPC, không sửa thẳng từ client.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  display_name, salary_day, notify_bills, notify_countdowns, notify_budget,
  daily_summary_at, telegram_log_expense, timezone
) on public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
