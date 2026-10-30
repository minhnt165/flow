-- Schema lõi: quỹ, danh mục, giao dịch, quy tắc định kỳ, countdown, liên kết Telegram, log thông báo.
-- Số dư và tiến độ KHÔNG lưu cứng; tính bằng view ở migration sau.

create type public.fund_kind as enum ('monthly_budget', 'goal', 'free');
create type public.category_type as enum ('expense', 'income');
create type public.transaction_type as enum ('expense', 'income', 'transfer');
create type public.transaction_source as enum ('web', 'telegram', 'auto');
create type public.recurring_kind as enum ('transfer', 'bill');

-- Bảng màu cố định của design system (giá trị lưu là khoá, UI map sang token CSS).
create or replace function public.is_palette_color(c text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select c in ('sky', 'orange', 'green', 'violet', 'pink', 'red', 'yellow', 'slate');
$$;

-- Giờ "hiện tại" có thể ghim bằng GUC app.now (chỉ dùng trong test); production luôn là now().
create or replace function public.fn_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.now', true), '')::timestamptz, now());
$$;

-- ── funds ──────────────────────────────────────────────────────────────────
create table public.funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default 'wallet',
  color text not null default 'sky' check (public.is_palette_color(color)),
  kind public.fund_kind not null default 'free',
  monthly_budget numeric(14, 0) check (monthly_budget > 0),
  target_amount numeric(14, 0) check (target_amount > 0),
  target_date date,
  countdown_id uuid,
  auto_contribution numeric(14, 0) check (auto_contribution > 0),
  auto_from_fund_id uuid references public.funds (id),
  is_default boolean not null default false,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint funds_budget_only_monthly check (kind = 'monthly_budget' or monthly_budget is null),
  constraint funds_goal_needs_target check (kind <> 'goal' or target_amount is not null),
  constraint funds_goal_only_fields check (
    kind = 'goal'
    or (target_amount is null and target_date is null and countdown_id is null and auto_contribution is null)
  ),
  constraint funds_auto_needs_source check (auto_contribution is null or auto_from_fund_id is not null),
  constraint funds_auto_not_self check (auto_from_fund_id is distinct from id)
);

comment on column public.funds.countdown_id is 'Quỹ mục tiêu có thể lấy một countdown làm hạn (ưu tiên hơn target_date).';
comment on column public.funds.auto_contribution is 'Số tiền tự động chuyển vào quỹ mỗi kỳ lương (đồng bộ sang recurring_rules).';

create unique index funds_one_default_per_user on public.funds (user_id) where is_default;
create index funds_user_idx on public.funds (user_id, sort_order);

-- ── categories ─────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  icon text not null default 'circle-ellipsis',
  color text not null default 'sky' check (public.is_palette_color(color)),
  type public.category_type not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, type, name)
);

create index categories_user_idx on public.categories (user_id, type, sort_order);

-- ── countdowns ─────────────────────────────────────────────────────────────
create table public.countdowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  event_date date not null,
  repeat_yearly boolean not null default false,
  icon text not null default 'calendar',
  color text not null default 'sky' check (public.is_palette_color(color)),
  remind_days int[] not null default '{0,1,3}' check (
    remind_days <@ array[0, 1, 3, 7] and cardinality(remind_days) <= 4
  ),
  fund_id uuid references public.funds (id) on delete set null,
  created_at timestamptz not null default now()
);

create index countdowns_user_idx on public.countdowns (user_id, event_date);

alter table public.funds
  add constraint funds_countdown_fk foreign key (countdown_id) references public.countdowns (id) on delete set null;

-- ── recurring_rules ────────────────────────────────────────────────────────
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.recurring_kind not null,
  name text check (char_length(name) <= 80),
  amount numeric(14, 0) not null check (amount > 0),
  fund_id uuid not null references public.funds (id) on delete cascade,
  to_fund_id uuid references public.funds (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  day_of_month int not null check (day_of_month between 1 and 31),
  run_after_salary boolean not null default false,
  next_run_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint recurring_transfer_shape check (
    (kind = 'transfer' and to_fund_id is not null and to_fund_id <> fund_id)
    or (kind = 'bill' and to_fund_id is null)
  )
);

comment on column public.recurring_rules.name is 'Tên hiển thị (bắt buộc với hoá đơn, vd "Tiền nhà").';

create index recurring_rules_due_idx on public.recurring_rules (next_run_on) where active;
create index recurring_rules_user_idx on public.recurring_rules (user_id);

-- ── transactions ───────────────────────────────────────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14, 0) not null check (amount > 0),
  fund_id uuid not null references public.funds (id),
  to_fund_id uuid references public.funds (id),
  category_id uuid references public.categories (id),
  note text check (char_length(note) <= 200),
  occurred_at timestamptz not null default now(),
  source public.transaction_source not null default 'web',
  recurring_rule_id uuid references public.recurring_rules (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint transactions_shape check (
    (type = 'transfer' and to_fund_id is not null and to_fund_id <> fund_id and category_id is null)
    or (type in ('expense', 'income') and category_id is not null and to_fund_id is null)
  )
);

comment on column public.transactions.fund_id is 'Quỹ bị trừ (chi, chuyển đi) hoặc được cộng (thu).';

create index transactions_user_time_idx on public.transactions (user_id, occurred_at desc);
create index transactions_fund_idx on public.transactions (fund_id, occurred_at);
create index transactions_to_fund_idx on public.transactions (to_fund_id) where to_fund_id is not null;
create index transactions_category_idx on public.transactions (category_id);
create index transactions_rule_idx on public.transactions (recurring_rule_id) where recurring_rule_id is not null;

-- ── telegram_link_codes ────────────────────────────────────────────────────
create table public.telegram_link_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);

create index telegram_link_codes_user_idx on public.telegram_link_codes (user_id);

-- ── notification_log ───────────────────────────────────────────────────────
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref_id uuid,
  sent_on date not null,
  sent_at timestamptz not null default now(),
  constraint notification_log_once_per_day unique nulls not distinct (user_id, kind, ref_id, sent_on)
);

create index notification_log_user_kind_idx on public.notification_log (user_id, kind, sent_on);

-- ── RLS: mỗi người chỉ thấy dữ liệu của mình ────────────────────────────────
alter table public.funds enable row level security;
alter table public.categories enable row level security;
alter table public.countdowns enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.transactions enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.notification_log enable row level security;

create policy "funds: chủ sở hữu" on public.funds
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categories: chủ sở hữu" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "countdowns: chủ sở hữu" on public.countdowns
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recurring_rules: chủ sở hữu" on public.recurring_rules
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "transactions: chủ sở hữu" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Mã liên kết và log chỉ được đọc; ghi qua RPC security definer hoặc service role.
create policy "telegram_link_codes: chủ sở hữu đọc" on public.telegram_link_codes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notification_log: chủ sở hữu đọc" on public.notification_log
  for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.telegram_link_codes, public.notification_log from anon, authenticated;
revoke all on public.funds, public.categories, public.countdowns, public.recurring_rules, public.transactions from anon;

-- ── Ràng buộc chéo bảng (RLS không tự kiểm tra khoá ngoại thuộc về ai) ────────
create or replace function public.validate_transaction()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cat_type public.category_type;
begin
  if not exists (select 1 from public.funds f where f.id = new.fund_id and f.user_id = new.user_id) then
    raise exception 'fund_not_found' using errcode = '23503';
  end if;
  if new.to_fund_id is not null
     and not exists (select 1 from public.funds f where f.id = new.to_fund_id and f.user_id = new.user_id) then
    raise exception 'to_fund_not_found' using errcode = '23503';
  end if;
  if new.category_id is not null then
    select c.type into v_cat_type
    from public.categories c
    where c.id = new.category_id and c.user_id = new.user_id;
    if v_cat_type is null then
      raise exception 'category_not_found' using errcode = '23503';
    end if;
    if v_cat_type::text <> new.type::text then
      raise exception 'category_type_mismatch' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger transactions_validate
  before insert or update on public.transactions
  for each row execute function public.validate_transaction();

create or replace function public.validate_owned_refs()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ref uuid;
begin
  -- Mọi cột *_fund_id / countdown_id / category_id phải trỏ tới bản ghi của cùng user.
  if tg_table_name = 'funds' then
    if new.auto_from_fund_id is not null and not exists (
      select 1 from public.funds f where f.id = new.auto_from_fund_id and f.user_id = new.user_id
    ) then
      raise exception 'fund_not_found' using errcode = '23503';
    end if;
    if new.countdown_id is not null and not exists (
      select 1 from public.countdowns c where c.id = new.countdown_id and c.user_id = new.user_id
    ) then
      raise exception 'countdown_not_found' using errcode = '23503';
    end if;
  elsif tg_table_name = 'countdowns' then
    if new.fund_id is not null and not exists (
      select 1 from public.funds f where f.id = new.fund_id and f.user_id = new.user_id
    ) then
      raise exception 'fund_not_found' using errcode = '23503';
    end if;
  elsif tg_table_name = 'recurring_rules' then
    foreach ref in array array[new.fund_id, new.to_fund_id] loop
      if ref is not null and not exists (
        select 1 from public.funds f where f.id = ref and f.user_id = new.user_id
      ) then
        raise exception 'fund_not_found' using errcode = '23503';
      end if;
    end loop;
    if new.category_id is not null and not exists (
      select 1 from public.categories c where c.id = new.category_id and c.user_id = new.user_id
    ) then
      raise exception 'category_not_found' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

create trigger funds_validate_refs
  before insert or update on public.funds
  for each row execute function public.validate_owned_refs();
create trigger countdowns_validate_refs
  before insert or update on public.countdowns
  for each row execute function public.validate_owned_refs();
create trigger recurring_rules_validate_refs
  before insert or update on public.recurring_rules
  for each row execute function public.validate_owned_refs();

-- Quỹ mặc định không được lưu trữ hay bỏ cờ mặc định nếu không có quỹ mặc định khác.
create or replace function public.protect_default_fund()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Độ sâu > 1 nghĩa là xoá dây chuyền khi xoá tài khoản: cho phép.
    if old.is_default and pg_trigger_depth() = 1 then
      raise exception 'default_fund_protected' using errcode = '23514';
    end if;
    return old;
  end if;
  if new.is_default and new.archived_at is not null then
    raise exception 'default_fund_protected' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger funds_protect_default
  before update or delete on public.funds
  for each row execute function public.protect_default_fund();
