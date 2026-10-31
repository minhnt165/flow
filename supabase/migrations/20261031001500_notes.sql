-- Module Ghi chú: văn bản tự do, ghim lên đầu, sắp theo lần sửa gần nhất.
-- Tiêu đề hoặc nội dung phải có ít nhất một; updated_at tự cập nhật bằng trigger.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 20000),
  pinned boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint notes_not_empty check (char_length(btrim(title)) > 0 or char_length(btrim(body)) > 0)
);

create index notes_user_idx on public.notes (user_id, pinned desc, updated_at desc);

alter table public.notes enable row level security;

create policy "notes: chủ sở hữu" on public.notes
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.notes from anon;

-- Chỉ đổi updated_at khi nội dung / tiêu đề / ghim thay đổi (không đổi khi update rỗng).
create or replace function public.notes_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.pinned is distinct from old.pinned then
    new.updated_at := public.fn_now();
  end if;
  return new;
end;
$$;

create trigger notes_touch
  before update on public.notes
  for each row execute function public.notes_touch();
