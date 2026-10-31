-- Module Thói quen: habits (mục tiêu số ngày mỗi tuần) + habit_logs (một dòng mỗi ngày đã làm).
-- Đánh dấu chỉ qua fn_toggle_habit (RLS của habits bảo đảm không ghi hộ thói quen người khác);
-- chuỗi ngày, số ngày trong tuần và 7 ngày gần nhất tính bằng view v_habits.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default 'activity',
  color text not null default 'green' check (public.is_palette_color(color)),
  target_per_week int not null default 7 check (target_per_week between 1 and 7),
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.habits.target_per_week is 'Số ngày mỗi tuần muốn làm (1–7); 7 = hằng ngày.';

create index habits_user_idx on public.habits (user_id, sort_order);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);

create index habit_logs_habit_day_idx on public.habit_logs (habit_id, day desc);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "habits: chủ sở hữu" on public.habits
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "habit_logs: chủ sở hữu đọc" on public.habit_logs
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.habits, public.habit_logs from anon;
revoke insert, update, delete on public.habit_logs from authenticated;

-- Đánh dấu / bỏ đánh dấu một ngày (mặc định hôm nay theo giờ người dùng). Không cho ngày tương lai.
-- Trả về trạng thái sau khi đổi: true = đã làm.
create or replace function public.fn_toggle_habit(p_habit_id uuid, p_day date default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_day date;
  v_deleted int;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.habits h where h.id = p_habit_id and h.user_id = v_user) then
    raise exception 'habit_not_found' using errcode = 'P0002';
  end if;
  v_day := coalesce(p_day, public.fn_today(v_user));
  if v_day > public.fn_today(v_user) then
    raise exception 'future_day' using errcode = '22023';
  end if;

  delete from public.habit_logs l where l.habit_id = p_habit_id and l.day = v_day;
  get diagnostics v_deleted = row_count;
  if v_deleted > 0 then
    return false;
  end if;
  insert into public.habit_logs (user_id, habit_id, day) values (v_user, p_habit_id, v_day);
  return true;
end;
$$;

revoke execute on function public.fn_toggle_habit(uuid, date) from public, anon;
grant execute on function public.fn_toggle_habit(uuid, date) to authenticated;

-- streak: số ngày liên tiếp kết thúc ở hôm nay, hoặc ở hôm qua nếu hôm nay chưa đánh dấu
-- (chuỗi chưa đứt cho tới hết ngày). week_count: thứ Hai → hôm nay. last7: phần tử cuối là hôm nay.
create view public.v_habits
with (security_invoker = true)
as
select
  h.id, h.user_id, h.name, h.icon, h.color, h.target_per_week, h.sort_order, h.archived_at, h.created_at,
  d.today,
  td.done_today,
  s.streak,
  w.week_count,
  tc.total_count,
  l7.last7
from public.habits h
cross join lateral (select public.fn_today(h.user_id) as today) d
cross join lateral (
  select exists (select 1 from public.habit_logs l where l.habit_id = h.id and l.day = d.today) as done_today
) td
cross join lateral (
  select count(*)::int as streak
  from (
    select l.day, row_number() over (order by l.day desc)::int as rn
    from public.habit_logs l
    where l.habit_id = h.id and l.day <= d.today
  ) x
  where x.day = (case when td.done_today then d.today else d.today - 1 end) - (x.rn - 1)
) s
cross join lateral (
  select count(*)::int as week_count
  from public.habit_logs l
  where l.habit_id = h.id and l.day >= date_trunc('week', d.today)::date and l.day <= d.today
) w
cross join lateral (
  select count(*)::int as total_count from public.habit_logs l where l.habit_id = h.id
) tc
cross join lateral (
  select array(
    select exists (select 1 from public.habit_logs l where l.habit_id = h.id and l.day = d.today - g)
    from generate_series(6, 0, -1) as g
  ) as last7
) l7;

comment on view public.v_habits is 'Thói quen kèm done_today, streak, week_count (T2→hôm nay), total_count, last7.';

grant select on public.v_habits to authenticated, service_role;
revoke all on public.v_habits from anon;
