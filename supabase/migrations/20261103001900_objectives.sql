-- Module Mục tiêu (không phải tiền): objectives (thời gian bắt đầu, hạn, số buổi mỗi tuần)
-- + objective_outputs (kết quả đầu ra, mỗi mục có hạn riêng) + objective_sessions (một dòng mỗi ngày đã làm).
-- Buổi chỉ ghi qua fn_toggle_objective_session; kế hoạch (tuần thứ mấy, buổi dự kiến) tính phía client.

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  why text check (why is null or char_length(why) <= 500),
  icon text not null default 'target',
  color text not null default 'violet' check (public.is_palette_color(color)),
  start_on date not null,
  end_on date,
  sessions_per_week int check (sessions_per_week between 1 and 7),
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (end_on is null or end_on >= start_on)
);

comment on column public.objectives.sessions_per_week is 'Số buổi mỗi tuần muốn làm (1–7); null = không đặt nhịp.';
comment on column public.objectives.completed_at is 'Thời điểm người dùng chốt đã hoàn thành; null = đang thực hiện.';

create index objectives_user_idx on public.objectives (user_id, sort_order);

create table public.objective_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  objective_id uuid not null references public.objectives (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  due_on date,
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index objective_outputs_objective_idx on public.objective_outputs (objective_id, sort_order);

create table public.objective_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  objective_id uuid not null references public.objectives (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (objective_id, day)
);

create index objective_sessions_objective_day_idx on public.objective_sessions (objective_id, day desc);

alter table public.objectives enable row level security;
alter table public.objective_outputs enable row level security;
alter table public.objective_sessions enable row level security;

create policy "objectives: chủ sở hữu" on public.objectives
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Kết quả đầu ra chỉ gắn được vào mục tiêu của chính mình (FK không đi qua RLS).
create policy "objective_outputs: chủ sở hữu" on public.objective_outputs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.objectives o
      where o.id = objective_id and o.user_id = (select auth.uid())
    )
  );
create policy "objective_sessions: chủ sở hữu đọc" on public.objective_sessions
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.objectives, public.objective_outputs, public.objective_sessions from anon;
revoke insert, update, delete on public.objective_sessions from authenticated;

-- Đánh dấu / bỏ đánh dấu đã làm một buổi trong ngày (mặc định hôm nay theo giờ người dùng).
-- Không cho ngày tương lai. Trả về trạng thái sau khi đổi: true = đã làm.
create or replace function public.fn_toggle_objective_session(p_objective_id uuid, p_day date default null)
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
  if not exists (
    select 1 from public.objectives o where o.id = p_objective_id and o.user_id = v_user
  ) then
    raise exception 'objective_not_found' using errcode = 'P0002';
  end if;
  v_day := coalesce(p_day, public.fn_today(v_user));
  if v_day > public.fn_today(v_user) then
    raise exception 'future_day' using errcode = '22023';
  end if;

  delete from public.objective_sessions s where s.objective_id = p_objective_id and s.day = v_day;
  get diagnostics v_deleted = row_count;
  if v_deleted > 0 then
    return false;
  end if;
  insert into public.objective_sessions (user_id, objective_id, day) values (v_user, p_objective_id, v_day);
  return true;
end;
$$;

revoke execute on function public.fn_toggle_objective_session(uuid, date) from public, anon;
grant execute on function public.fn_toggle_objective_session(uuid, date) to authenticated;

-- week_count: thứ Hai → hôm nay. outputs_overdue: chưa xong và hạn trước hôm nay.
create view public.v_objectives
with (security_invoker = true)
as
select
  o.id, o.user_id, o.title, o.why, o.icon, o.color, o.start_on, o.end_on, o.sessions_per_week,
  o.completed_at, o.sort_order, o.created_at,
  d.today,
  exists (
    select 1 from public.objective_sessions s where s.objective_id = o.id and s.day = d.today
  ) as done_today,
  (
    select count(*)::int from public.objective_sessions s
    where s.objective_id = o.id and s.day >= date_trunc('week', d.today)::date and s.day <= d.today
  ) as week_count,
  (select count(*)::int from public.objective_sessions s where s.objective_id = o.id) as total_sessions,
  op.outputs_total,
  op.outputs_done,
  op.outputs_overdue
from public.objectives o
cross join lateral (select public.fn_today(o.user_id) as today) d
cross join lateral (
  select
    count(*)::int as outputs_total,
    count(*) filter (where p.done_at is not null)::int as outputs_done,
    count(*) filter (where p.done_at is null and p.due_on < d.today)::int as outputs_overdue
  from public.objective_outputs p
  where p.objective_id = o.id
) op;

comment on view public.v_objectives is 'Mục tiêu kèm done_today, week_count (T2→hôm nay), total_sessions và đếm kết quả đầu ra.';

grant select on public.v_objectives to authenticated, service_role;
revoke all on public.v_objectives from anon;
