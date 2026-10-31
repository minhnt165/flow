-- Module Việc cần làm: bảng todos + view v_todos (số ngày tới hạn theo giờ người dùng).
-- Hạn (due_on) là tuỳ chọn; xong = done_at có giá trị. Không ưu tiên, không lặp: giữ đúng "ghi nhanh một việc".

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  note text check (note is null or char_length(note) <= 1000),
  due_on date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.todos is 'Việc cần làm: hạn tuỳ chọn, done_at null = chưa xong.';

create index todos_user_open_idx on public.todos (user_id, due_on) where done_at is null;
create index todos_user_done_idx on public.todos (user_id, done_at desc) where done_at is not null;

alter table public.todos enable row level security;

create policy "todos: chủ sở hữu" on public.todos
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.todos from anon;

-- View: today và days_left tính theo múi giờ người dùng; days_left null khi không có hạn, âm = quá hạn.
create view public.v_todos
with (security_invoker = true)
as
select
  t.id, t.user_id, t.title, t.note, t.due_on, t.done_at, t.created_at,
  d.today,
  (t.due_on - d.today) as days_left,
  (t.done_at is not null) as done
from public.todos t
cross join lateral (select public.fn_today(t.user_id) as today) d;

comment on view public.v_todos is 'Việc cần làm kèm days_left (null = không hạn, âm = quá hạn) và cờ done.';

grant select on public.v_todos to authenticated, service_role;
revoke all on public.v_todos from anon;
