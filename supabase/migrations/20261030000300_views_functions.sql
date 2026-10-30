-- View và function nghiệp vụ. Mọi số tiền là numeric(14,0); "hôm nay" tính theo múi giờ của người dùng.

-- ── Thời gian theo người dùng ───────────────────────────────────────────────
create or replace function public.fn_user_tz(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.timezone from public.profiles p where p.id = p_user), 'Asia/Ho_Chi_Minh');
$$;

create or replace function public.fn_today(p_user uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select (public.fn_now() at time zone public.fn_user_tz(p_user))::date;
$$;

-- Đầu ngày (00:00 giờ địa phương) dưới dạng timestamptz.
create or replace function public.fn_local_start(p_day date, p_tz text)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (p_day::timestamp at time zone p_tz);
$$;

-- ── Lịch lương ─────────────────────────────────────────────────────────────
-- Ngày lương trong tháng chứa p_month; tháng ngắn hơn thì lấy ngày cuối tháng.
create or replace function public.fn_salary_date(p_month date, p_day int)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('month', p_month)::date
    + (least(p_day, extract(day from date_trunc('month', p_month) + interval '1 month - 1 day')::int) - 1);
$$;

-- Ngày lương gần nhất SAU p_after.
create or replace function public.fn_next_salary_date(p_after date, p_day int)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when public.fn_salary_date(p_after, p_day) > p_after then public.fn_salary_date(p_after, p_day)
    else public.fn_salary_date((p_after + interval '1 month')::date, p_day)
  end;
$$;

-- Số kỳ lương d với p_from < d < p_to (kỳ trùng đúng ngày hạn không kịp góp).
create or replace function public.fn_pay_periods(p_from date, p_to date, p_day int)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when p_to is null or p_to <= p_from then 0 else (
    select count(*)::int
    from generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month') m
    where public.fn_salary_date(m::date, p_day) > p_from
      and public.fn_salary_date(m::date, p_day) < p_to
  ) end;
$$;

-- ── Countdown ──────────────────────────────────────────────────────────────
-- Ngày kỷ niệm của p_event trong năm p_year (29/02 → 28/02 ở năm không nhuận).
create or replace function public.fn_anniversary(p_event date, p_year int)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(
    p_year,
    extract(month from p_event)::int,
    least(
      extract(day from p_event)::int,
      extract(day from (make_date(p_year, extract(month from p_event)::int, 1) + interval '1 month - 1 day'))::int
    )
  );
$$;

create or replace function public.fn_next_occurrence_on(p_event date, p_repeat boolean, p_today date)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when not p_repeat or p_event >= p_today then p_event
    when public.fn_anniversary(p_event, extract(year from p_today)::int) >= p_today
      then public.fn_anniversary(p_event, extract(year from p_today)::int)
    else public.fn_anniversary(p_event, extract(year from p_today)::int + 1)
  end;
$$;

-- Ngày tới của countdown (tự sang năm sau khi đã qua nếu lặp hằng năm).
create or replace function public.fn_next_occurrence(c public.countdowns)
returns date
language sql
stable
set search_path = ''
as $$
  select public.fn_next_occurrence_on(c.event_date, c.repeat_yearly, public.fn_today(c.user_id));
$$;

create or replace view public.v_countdowns
with (security_invoker = true)
as
with base as (
  select
    c.*,
    public.fn_today(c.user_id) as today,
    public.fn_next_occurrence(c) as next_occurrence,
    (c.created_at at time zone public.fn_user_tz(c.user_id))::date as created_on
  from public.countdowns c
),
spans as (
  select
    b.*,
    -- Mốc bắt đầu của vòng tiến độ: lần lặp trước (nếu có) hoặc ngày tạo.
    case
      when b.repeat_yearly and b.next_occurrence > b.event_date
        then greatest(b.created_on, public.fn_anniversary(b.event_date, extract(year from b.next_occurrence)::int - 1))
      else least(b.created_on, b.next_occurrence)
    end as cycle_start
  from base b
)
select
  s.id, s.user_id, s.title, s.event_date, s.repeat_yearly, s.icon, s.color, s.remind_days, s.fund_id, s.created_at,
  s.next_occurrence,
  (s.next_occurrence - s.today) as days_left,
  s.cycle_start,
  case
    when s.next_occurrence <= s.cycle_start then 100
    else least(100, greatest(0, round((s.today - s.cycle_start) * 100.0 / (s.next_occurrence - s.cycle_start), 1)))
  end as elapsed_pct,
  (not s.repeat_yearly and s.event_date < s.today) as is_past
from spans s;

-- ── Số dư quỹ ──────────────────────────────────────────────────────────────
-- Số dư = thu + chuyển đến − chi − chuyển đi.
create or replace view public.v_fund_balances
with (security_invoker = true)
as
select
  f.id, f.user_id, f.name, f.icon, f.color, f.kind, f.monthly_budget, f.target_amount, f.target_date,
  f.countdown_id, f.auto_contribution, f.auto_from_fund_id, f.is_default, f.sort_order, f.archived_at,
  f.created_at,
  coalesce(b.balance, 0)::numeric(14, 0) as balance
from public.funds f
left join lateral (
  select sum(
    case
      when t.type = 'income' then t.amount
      when t.type = 'expense' then -t.amount
      when t.to_fund_id = f.id then t.amount
      else -t.amount
    end
  ) as balance
  from public.transactions t
  where t.fund_id = f.id or t.to_fund_id = f.id
) b on true;

-- ── Ngân sách tháng ────────────────────────────────────────────────────────
-- Với mỗi quỹ monthly_budget: đã chi trong tháng chứa p_month (null = tháng hiện tại của người dùng).
create or replace function public.fn_budget_month(p_month date default null)
returns table (
  fund_id uuid,
  user_id uuid,
  name text,
  monthly_budget numeric(14, 0),
  month_start date,
  spent numeric(14, 0),
  remaining numeric(14, 0),
  pct_used numeric,
  days_left int
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    f.id,
    f.user_id,
    f.name,
    f.monthly_budget,
    m.month_start,
    coalesce(s.spent, 0)::numeric(14, 0),
    case when f.monthly_budget is null then null else (f.monthly_budget - coalesce(s.spent, 0))::numeric(14, 0) end,
    case when f.monthly_budget is null then null else round(coalesce(s.spent, 0) * 100.0 / f.monthly_budget, 1) end,
    case
      when m.today < m.month_start then (m.month_end - m.month_start + 1)
      when m.today > m.month_end then 0
      else (m.month_end - m.today + 1)
    end::int
  from public.funds f
  cross join lateral (
    select
      public.fn_today(f.user_id) as today,
      public.fn_user_tz(f.user_id) as tz,
      date_trunc('month', coalesce(p_month, public.fn_today(f.user_id)))::date as month_start,
      (date_trunc('month', coalesce(p_month, public.fn_today(f.user_id))) + interval '1 month - 1 day')::date as month_end
  ) m
  left join lateral (
    select sum(t.amount) as spent
    from public.transactions t
    where t.fund_id = f.id
      and t.type = 'expense'
      and t.occurred_at >= public.fn_local_start(m.month_start, m.tz)
      and t.occurred_at < public.fn_local_start(m.month_end + 1, m.tz)
  ) s on true
  where f.kind = 'monthly_budget' and f.archived_at is null;
$$;

create or replace view public.v_fund_month
with (security_invoker = true)
as
select * from public.fn_budget_month(null);

-- ── Tiến độ quỹ mục tiêu ───────────────────────────────────────────────────
create or replace view public.v_fund_goal_progress
with (security_invoker = true)
as
with base as (
  select
    f.id as fund_id,
    f.user_id,
    f.name,
    f.icon,
    f.color,
    f.target_amount,
    f.auto_contribution,
    f.auto_from_fund_id,
    f.countdown_id,
    coalesce(public.fn_next_occurrence(c), f.target_date) as deadline,
    (f.created_at at time zone public.fn_user_tz(f.user_id))::date as start_date,
    public.fn_today(f.user_id) as today,
    coalesce((select p.salary_day from public.profiles p where p.id = f.user_id), 1) as salary_day,
    b.balance as contributed
  from public.funds f
  join public.v_fund_balances b on b.id = f.id
  left join public.countdowns c on c.id = f.countdown_id
  where f.kind = 'goal' and f.archived_at is null
),
calc as (
  select
    base.*,
    greatest(base.target_amount - base.contributed, 0)::numeric(14, 0) as remaining,
    round(base.contributed * 100.0 / base.target_amount, 1) as pct,
    public.fn_pay_periods(base.today, base.deadline, base.salary_day) as periods_left,
    -- Không có hạn thì không có "đáng lẽ" và không bao giờ bị coi là chậm.
    case
      when base.deadline is null then null
      when base.deadline <= base.start_date then 100
      else least(100, greatest(0, round((base.today - base.start_date) * 100.0 / (base.deadline - base.start_date), 1)))
    end as expected_pct,
    (
      select coalesce(sum(case when t.to_fund_id = base.fund_id or t.type = 'income' then t.amount else 0 end), 0)
      from public.transactions t
      where (t.to_fund_id = base.fund_id or (t.fund_id = base.fund_id and t.type = 'income'))
        and t.occurred_at >= public.fn_now() - interval '90 days'
    ) / 3 as avg_monthly_contribution
  from base
)
select
  calc.fund_id, calc.user_id, calc.name, calc.icon, calc.color, calc.target_amount, calc.contributed,
  calc.remaining, calc.pct, calc.deadline, calc.start_date, calc.today, calc.salary_day,
  (calc.deadline - calc.today) as days_left,
  calc.periods_left,
  -- Cần góp mỗi kỳ, làm tròn lên bội số 50.000 ₫ cho dễ chuyển.
  case
    when calc.remaining = 0 then 0
    when calc.deadline is null then null
    when calc.periods_left > 0 then (ceil(calc.remaining / calc.periods_left / 50000.0) * 50000)::numeric(14, 0)
    else calc.remaining
  end as per_period,
  calc.expected_pct,
  coalesce(calc.contributed < calc.target_amount and calc.pct < calc.expected_pct, false) as behind_schedule,
  calc.auto_contribution,
  calc.auto_from_fund_id,
  calc.countdown_id,
  round(calc.avg_monthly_contribution)::numeric(14, 0) as avg_monthly_contribution
from calc;

-- ── Tổng hợp tháng ─────────────────────────────────────────────────────────
create or replace function public.fn_month_summary(p_user_id uuid, p_month date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as m0,
      (date_trunc('month', p_month) + interval '1 month')::date as m1,
      public.fn_user_tz(p_user_id) as tz
  ),
  tx as (
    select t.*
    from public.transactions t, bounds b
    where t.user_id = p_user_id
      and t.occurred_at >= public.fn_local_start(b.m0, b.tz)
      and t.occurred_at < public.fn_local_start(b.m1, b.tz)
  )
  select jsonb_build_object(
    'month', (select m0 from bounds),
    'total_expense', coalesce((select sum(amount) from tx where type = 'expense'), 0),
    'total_income', coalesce((select sum(amount) from tx where type = 'income'), 0),
    'total_saved', coalesce((
      select sum(tx.amount) from tx join public.funds f on f.id = tx.to_fund_id
      where tx.type = 'transfer' and f.kind = 'goal'
    ), 0),
    'by_category', coalesce((
      select jsonb_agg(r order by r.amount desc)
      from (
        select c.id as category_id, c.name, c.icon, c.color, sum(tx.amount) as amount, count(*) as count
        from tx join public.categories c on c.id = tx.category_id
        where tx.type = 'expense'
        group by c.id, c.name, c.icon, c.color
      ) r
    ), '[]'::jsonb),
    'by_fund', coalesce((
      select jsonb_agg(r)
      from (
        select tx.fund_id, sum(tx.amount) as spent
        from tx where tx.type = 'expense'
        group by tx.fund_id
      ) r
    ), '[]'::jsonb)
  );
$$;

-- Góp vào một quỹ theo tháng (cho biểu đồ cột ở trang chi tiết quỹ mục tiêu).
create or replace function public.fn_fund_monthly_inflow(p_fund_id uuid, p_months int default 6)
returns table (month_start date, amount numeric(14, 0))
language sql
stable
security invoker
set search_path = ''
as $$
  with f as (
    select id, user_id, public.fn_user_tz(user_id) as tz, public.fn_today(user_id) as today
    from public.funds where id = p_fund_id
  ),
  months as (
    select generate_series(
      date_trunc('month', f.today) - make_interval(months => greatest(p_months, 1) - 1),
      date_trunc('month', f.today),
      interval '1 month'
    )::date as m, f.tz
    from f
  )
  select
    months.m,
    coalesce((
      select sum(t.amount)
      from public.transactions t
      where (t.to_fund_id = p_fund_id or (t.fund_id = p_fund_id and t.type = 'income'))
        and t.occurred_at >= public.fn_local_start(months.m, months.tz)
        and t.occurred_at < public.fn_local_start((months.m + interval '1 month')::date, months.tz)
    ), 0)::numeric(14, 0)
  from months
  order by months.m;
$$;

-- ── Đồng bộ tự động góp và liên kết countdown ──────────────────────────────
create or replace function public.sync_fund_automation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_salary_day int;
  v_today date;
  v_countdown uuid;
begin
  select coalesce(p.salary_day, 1) into v_salary_day from public.profiles p where p.id = new.user_id;
  v_salary_day := coalesce(v_salary_day, 1);
  v_today := public.fn_today(new.user_id);

  if new.kind = 'goal' and new.auto_contribution is not null and new.archived_at is null then
    update public.recurring_rules r
       set amount = new.auto_contribution,
           fund_id = new.auto_from_fund_id,
           active = true
     where r.to_fund_id = new.id and r.kind = 'transfer' and r.run_after_salary;
    if not found then
      insert into public.recurring_rules
        (user_id, kind, name, amount, fund_id, to_fund_id, day_of_month, run_after_salary, next_run_on)
      values
        (new.user_id, 'transfer', new.name, new.auto_contribution, new.auto_from_fund_id, new.id,
         v_salary_day, true, public.fn_next_salary_date(v_today, v_salary_day));
    end if;

    -- Bật tự động góp mà chưa có countdown làm hạn: tạo countdown cùng tên để bot nhắc.
    if new.countdown_id is null and new.target_date is not null then
      insert into public.countdowns (user_id, title, event_date, icon, color, fund_id)
      values (new.user_id, new.name, new.target_date, 'target', new.color, new.id)
      returning id into v_countdown;
      update public.funds set countdown_id = v_countdown where id = new.id;
    end if;
  else
    update public.recurring_rules r
       set active = false
     where r.to_fund_id = new.id and r.kind = 'transfer' and r.run_after_salary and r.active;
  end if;
  return null;
end;
$$;

create trigger funds_sync_automation
  after insert or update of kind, auto_contribution, auto_from_fund_id, archived_at, target_date
  on public.funds
  for each row execute function public.sync_fund_automation();

create or replace function public.sync_fund_countdown_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'funds' then
    if new.countdown_id is not null then
      update public.countdowns set fund_id = new.id
       where id = new.countdown_id and fund_id is distinct from new.id;
    end if;
  else
    if new.fund_id is not null then
      update public.funds set countdown_id = new.id
       where id = new.fund_id and kind = 'goal' and countdown_id is null;
    end if;
  end if;
  return null;
end;
$$;

create trigger funds_sync_countdown_link
  after insert or update of countdown_id on public.funds
  for each row execute function public.sync_fund_countdown_link();
create trigger countdowns_sync_fund_link
  after insert or update of fund_id on public.countdowns
  for each row execute function public.sync_fund_countdown_link();

-- Đổi ngày lương → dời lịch các quy tắc chạy sau lương.
create or replace function public.sync_salary_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.salary_day is distinct from old.salary_day and new.salary_day is not null then
    update public.recurring_rules r
       set day_of_month = new.salary_day,
           next_run_on = public.fn_next_salary_date(public.fn_today(new.id), new.salary_day)
     where r.user_id = new.id and r.run_after_salary;
  end if;
  return null;
end;
$$;

create trigger profiles_sync_salary_day
  after update of salary_day on public.profiles
  for each row execute function public.sync_salary_day();

-- ── RPC cho web ────────────────────────────────────────────────────────────
-- Mã liên kết Telegram 6 ký tự (bỏ 0/O/1/I dễ nhầm), hết hạn sau 10 phút.
create or replace function public.create_telegram_link_code()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_bytes bytea;
  v_expires timestamptz := public.fn_now() + interval '10 minutes';
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from public.telegram_link_codes where user_id = v_user or expires_at < public.fn_now();
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
    end loop;
    begin
      insert into public.telegram_link_codes (code, user_id, expires_at) values (v_code, v_user, v_expires);
      exit;
    exception when unique_violation then
      -- trùng mã (rất hiếm): sinh lại
    end;
  end loop;
  return jsonb_build_object('code', v_code, 'expires_at', v_expires);
end;
$$;

create or replace function public.disconnect_telegram()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set telegram_chat_id = null, telegram_username = null where id = auth.uid();
$$;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ── RPC cho Edge Functions (chỉ service_role) ──────────────────────────────
-- Webhook: tra mã, gắn chat_id vào hồ sơ, xoá mã. Trả user_id hoặc null nếu mã sai/hết hạn.
create or replace function public.link_telegram(p_code text, p_chat_id bigint, p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  delete from public.telegram_link_codes
   where code = v_code and expires_at >= public.fn_now()
  returning user_id into v_user;
  if v_user is null then
    return null;
  end if;
  -- Một chat chỉ gắn với một tài khoản.
  update public.profiles set telegram_chat_id = null, telegram_username = null
   where telegram_chat_id = p_chat_id and id <> v_user;
  update public.profiles set telegram_chat_id = p_chat_id, telegram_username = p_username where id = v_user;
  return v_user;
end;
$$;

-- Webhook: ghi một giao dịch từ tin nhắn đã parse, trả thông tin để bot xác nhận.
create or replace function public.fn_telegram_log(
  p_chat_id bigint,
  p_type public.transaction_type,
  p_amount numeric,
  p_note text,
  p_category_name text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_fund public.funds;
  v_cat public.categories;
  v_tx uuid;
  v_budget numeric;
  v_remaining numeric;
  v_days int;
  v_balance numeric;
begin
  if p_type not in ('expense', 'income') then
    raise exception 'unsupported_type' using errcode = '22023';
  end if;
  select * into v_profile from public.profiles where telegram_chat_id = p_chat_id;
  if v_profile.id is null then
    return jsonb_build_object('status', 'not_linked');
  end if;
  if not v_profile.telegram_log_expense then
    return jsonb_build_object('status', 'disabled');
  end if;
  select * into v_fund from public.funds
   where user_id = v_profile.id and is_default and archived_at is null;
  if v_fund.id is null then
    return jsonb_build_object('status', 'no_fund');
  end if;

  select * into v_cat from public.categories
   where user_id = v_profile.id and type::text = p_type::text and name = p_category_name;
  if v_cat.id is null then
    select * into v_cat from public.categories
     where user_id = v_profile.id and type::text = p_type::text
     order by (name = 'Khác') desc, sort_order desc
     limit 1;
  end if;
  if v_cat.id is null then
    return jsonb_build_object('status', 'no_category');
  end if;

  insert into public.transactions (user_id, type, amount, fund_id, category_id, note, occurred_at, source)
  values (v_profile.id, p_type, p_amount, v_fund.id, v_cat.id, nullif(btrim(p_note), ''), p_occurred_at, 'telegram')
  returning id into v_tx;

  select b.monthly_budget, b.remaining, b.days_left into v_budget, v_remaining, v_days
  from public.fn_budget_month(null) b where b.fund_id = v_fund.id;
  select vb.balance into v_balance from public.v_fund_balances vb where vb.id = v_fund.id;

  return jsonb_build_object(
    'status', 'ok',
    'user_id', v_profile.id,
    'transaction_id', v_tx,
    'type', p_type,
    'amount', p_amount,
    'note', nullif(btrim(p_note), ''),
    'category', v_cat.name,
    'fund', v_fund.name,
    'fund_balance', v_balance,
    'budget', v_budget,
    'budget_remaining', v_remaining,
    'days_left', v_days
  );
end;
$$;

-- Job run-recurring: tạo giao dịch cho quy tắc chuyển quỹ đến hạn, dời sang kỳ sau.
create or replace function public.fn_run_recurring(p_now timestamptz default null)
returns table (
  user_id uuid,
  telegram_chat_id bigint,
  rule_id uuid,
  transaction_id uuid,
  amount numeric(14, 0),
  from_fund text,
  to_fund text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  r record;
  v_today date;
  v_tx uuid;
begin
  if p_now is not null then
    perform set_config('app.now', p_now::text, true);
  end if;

  for r in
    select rr.*, p.salary_day, p.telegram_chat_id as chat_id, p.id as profile_id
    from public.recurring_rules rr
    join public.profiles p on p.id = rr.user_id
    where rr.active and rr.kind = 'transfer'
    for update of rr skip locked
  loop
    v_today := public.fn_today(r.user_id);
    continue when not (
      r.next_run_on <= v_today
      or (r.run_after_salary and r.salary_day is not null
          and public.fn_salary_date(v_today, r.salary_day) = v_today)
    );
    -- Không chạy hai lần trong một ngày cho cùng quy tắc.
    continue when exists (
      select 1 from public.transactions t
      where t.recurring_rule_id = r.id
        and t.occurred_at >= public.fn_local_start(v_today, public.fn_user_tz(r.user_id))
    );

    insert into public.transactions (user_id, type, amount, fund_id, to_fund_id, note, occurred_at, source, recurring_rule_id)
    values (r.user_id, 'transfer', r.amount, r.fund_id, r.to_fund_id,
            case when r.run_after_salary then 'Tự động sau lương' else coalesce(r.name, 'Chuyển định kỳ') end,
            public.fn_now(), 'auto', r.id)
    returning id into v_tx;

    update public.recurring_rules rr
       set next_run_on = case
         when r.run_after_salary then public.fn_next_salary_date(v_today, coalesce(r.salary_day, r.day_of_month))
         else public.fn_next_salary_date(v_today, r.day_of_month)
       end
     where rr.id = r.id;

    user_id := r.user_id;
    telegram_chat_id := r.chat_id;
    rule_id := r.id;
    transaction_id := v_tx;
    amount := r.amount;
    from_fund := (select f.name from public.funds f where f.id = r.fund_id);
    to_fund := (select f.name from public.funds f where f.id = r.to_fund_id);
    return next;
  end loop;
end;
$$;

-- Bot: "Đánh dấu đã trả" một hoá đơn → tạo giao dịch chi và dời hạn sang tháng sau.
create or replace function public.fn_mark_bill_paid(p_rule_id uuid, p_chat_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_cat uuid;
  v_tx uuid;
begin
  select rr.* into r
  from public.recurring_rules rr
  join public.profiles p on p.id = rr.user_id
  where rr.id = p_rule_id and rr.kind = 'bill' and p.telegram_chat_id = p_chat_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  v_cat := coalesce(r.category_id, (
    select c.id from public.categories c
    where c.user_id = r.user_id and c.type = 'expense' and c.name = 'Hoá đơn'
  ), (
    select c.id from public.categories c
    where c.user_id = r.user_id and c.type = 'expense' order by c.sort_order desc limit 1
  ));

  insert into public.transactions (user_id, type, amount, fund_id, category_id, note, occurred_at, source, recurring_rule_id)
  values (r.user_id, 'expense', r.amount, r.fund_id, v_cat, r.name, public.fn_now(), 'telegram', r.id)
  returning id into v_tx;

  update public.recurring_rules
     set next_run_on = public.fn_salary_date((r.next_run_on + interval '1 month')::date, r.day_of_month)
   where id = r.id;

  return jsonb_build_object('status', 'ok', 'transaction_id', v_tx, 'name', r.name, 'amount', r.amount);
end;
$$;

-- Job notify-daily: các thông báo cần gửi hôm nay (chưa có trong notification_log).
create or replace function public.fn_daily_notifications(p_now timestamptz default null)
returns table (
  user_id uuid,
  telegram_chat_id bigint,
  kind text,
  ref_id uuid,
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
    select p.*, public.fn_today(p.id) as d
    from public.profiles p
    where p.telegram_chat_id is not null
  ),
  candidates as (
    -- Countdown: số ngày còn lại nằm trong remind_days.
    select u.id as uid, u.telegram_chat_id as chat, 'countdown'::text as k, c.id as ref, u.d,
           jsonb_build_object('title', c.title, 'date', c.next_occurrence, 'days_left', c.days_left) as body
    from users u
    join public.v_countdowns c on c.user_id = u.id
    where u.notify_countdowns and not c.is_past and c.days_left = any (c.remind_days)

    union all
    -- Hoá đơn đến hạn hôm nay hoặc trong 3 ngày tới.
    select u.id, u.telegram_chat_id, 'bill', r.id, u.d,
           jsonb_build_object('name', coalesce(r.name, 'Hoá đơn'), 'amount', r.amount, 'due', r.next_run_on,
                              'days_left', r.next_run_on - u.d)
    from users u
    join public.recurring_rules r on r.user_id = u.id
    where u.notify_bills and r.active and r.kind = 'bill'
      and r.next_run_on between u.d and u.d + 3

    union all
    -- Ngân sách tháng vượt 80% / 100% lần đầu trong tháng.
    select u.id, u.telegram_chat_id,
           case when b.pct_used >= 100 then 'budget_100' else 'budget_80' end,
           b.fund_id, u.d,
           jsonb_build_object('fund', b.name, 'spent', b.spent, 'remaining', b.remaining,
                              'budget', b.monthly_budget, 'pct', b.pct_used, 'days_left', b.days_left)
    from users u
    join public.fn_budget_month(null) b on b.user_id = u.id
    where u.notify_budget and b.monthly_budget is not null and b.pct_used >= 80
      and not exists (
        select 1 from public.notification_log l
        where l.user_id = u.id and l.ref_id = b.fund_id
          and l.kind = case when b.pct_used >= 100 then 'budget_100' else 'budget_80' end
          and l.sent_on >= date_trunc('month', u.d)::date
      )

    union all
    -- Quỹ mục tiêu chậm tiến độ, còn ít nhất một kỳ lương.
    select u.id, u.telegram_chat_id, 'goal_behind', g.fund_id, u.d,
           jsonb_build_object('fund', g.name, 'pct', g.pct, 'per_period', g.per_period,
                              'periods_left', g.periods_left, 'deadline', g.deadline)
    from users u
    join public.v_fund_goal_progress g on g.user_id = u.id
    where u.notify_budget and g.behind_schedule and g.periods_left >= 1
  )
  select c.uid, c.chat, c.k, c.ref, c.d, c.body
  from candidates c
  where not exists (
    select 1 from public.notification_log l
    where l.user_id = c.uid and l.kind = c.k and l.ref_id is not distinct from c.ref and l.sent_on = c.d
  );
end;
$$;

-- Job notify-evening (chạy mỗi 15 phút): người dùng tới giờ tổng kết, kèm số liệu hôm nay.
create or replace function public.fn_evening_summaries(p_now timestamptz default null)
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
    where p.telegram_chat_id is not null and p.daily_summary_at is not null
  )
  select
    u.id,
    u.telegram_chat_id,
    u.d,
    jsonb_build_object(
      'total', coalesce((
        select sum(t.amount) from public.transactions t
        where t.user_id = u.id and t.type = 'expense'
          and t.occurred_at >= public.fn_local_start(u.d, u.tz)
          and t.occurred_at < public.fn_local_start(u.d + 1, u.tz)
      ), 0),
      'avg7', coalesce((
        select round(sum(t.amount) / 7) from public.transactions t
        where t.user_id = u.id and t.type = 'expense'
          and t.occurred_at >= public.fn_local_start(u.d - 7, u.tz)
          and t.occurred_at < public.fn_local_start(u.d, u.tz)
      ), 0),
      'by_category', coalesce((
        select jsonb_agg(r order by r.amount desc) from (
          select c.name, sum(t.amount) as amount
          from public.transactions t join public.categories c on c.id = t.category_id
          where t.user_id = u.id and t.type = 'expense'
            and t.occurred_at >= public.fn_local_start(u.d, u.tz)
            and t.occurred_at < public.fn_local_start(u.d + 1, u.tz)
          group by c.name
        ) r
      ), '[]'::jsonb)
    )
  from users u
  where u.local_time >= u.daily_summary_at
    and u.local_time < u.daily_summary_at + interval '15 minutes'
    and not exists (
      select 1 from public.notification_log l
      where l.user_id = u.id and l.kind = 'evening' and l.sent_on = u.d
    );
end;
$$;

-- ── Quyền thực thi ─────────────────────────────────────────────────────────
revoke execute on function
  public.link_telegram(text, bigint, text),
  public.fn_telegram_log(bigint, public.transaction_type, numeric, text, text, timestamptz),
  public.fn_run_recurring(timestamptz),
  public.fn_mark_bill_paid(uuid, bigint),
  public.fn_daily_notifications(timestamptz),
  public.fn_evening_summaries(timestamptz)
from public, anon, authenticated;

grant execute on function
  public.link_telegram(text, bigint, text),
  public.fn_telegram_log(bigint, public.transaction_type, numeric, text, text, timestamptz),
  public.fn_run_recurring(timestamptz),
  public.fn_mark_bill_paid(uuid, bigint),
  public.fn_daily_notifications(timestamptz),
  public.fn_evening_summaries(timestamptz)
to service_role;

revoke execute on function public.create_telegram_link_code(), public.disconnect_telegram(), public.delete_account()
from public, anon;
grant execute on function public.create_telegram_link_code(), public.disconnect_telegram(), public.delete_account()
to authenticated;

grant select on public.v_fund_balances, public.v_fund_month, public.v_fund_goal_progress, public.v_countdowns
to authenticated, service_role;
revoke all on public.v_fund_balances, public.v_fund_month, public.v_fund_goal_progress, public.v_countdowns from anon;
