-- Hoá đơn theo chu kỳ: interval_months (1, 2, 3, 6, 12), mặc định hằng tháng. Quy tắc chuyển quỹ không dùng.
-- Hạn tới sau khi trả nhảy theo chu kỳ kể từ hạn hiện tại, giữ ngày trong tháng (tháng ngắn lấy ngày cuối).

alter table public.recurring_rules
  add column interval_months int not null default 1 check (interval_months in (1, 2, 3, 6, 12));

comment on column public.recurring_rules.interval_months is 'Chu kỳ hoá đơn theo tháng (1, 2, 3, 6, 12).';

drop function if exists public.fn_bill_next_due(date, date, int);

-- Lần đến hạn đầu tiên trong chuỗi (hạn + k × chu kỳ) nằm SAU max(hạn hiện tại, ngày trả).
create or replace function public.fn_bill_next_due(p_due date, p_paid_on date, p_day int, p_interval int default 1)
returns date
language sql
immutable
set search_path = ''
as $$
  with b as (
    select greatest(p_due, p_paid_on) as base
  ),
  k as (
    select b.base,
           (((extract(year from b.base) - extract(year from p_due)) * 12
             + extract(month from b.base) - extract(month from p_due))::int / p_interval) as k0
    from b
  ),
  c as (
    select k.base, k.k0,
           public.fn_salary_date((date_trunc('month', p_due) + make_interval(months => k.k0 * p_interval))::date, p_day) as cand
    from k
  )
  select case
    when c.cand > c.base then c.cand
    else public.fn_salary_date((date_trunc('month', p_due) + make_interval(months => (c.k0 + 1) * p_interval))::date, p_day)
  end
  from c;
$$;

create or replace function public.fn_pay_bill(
  p_rule_id uuid,
  p_amount numeric default null,
  p_paid_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r record;
  v_paid_at timestamptz;
  v_paid_on date;
  v_tx uuid;
  v_next date;
begin
  select rr.* into r
  from public.recurring_rules rr
  where rr.id = p_rule_id and rr.kind = 'bill' and rr.user_id = (select auth.uid());
  if not found then
    raise exception 'bill_not_found' using errcode = 'P0002';
  end if;
  if p_amount is not null and p_amount <= 0 then
    raise exception 'amount_must_be_positive' using errcode = '23514';
  end if;

  v_paid_at := coalesce(p_paid_at, public.fn_now());
  v_paid_on := (v_paid_at at time zone public.fn_user_tz(r.user_id))::date;

  insert into public.transactions (user_id, type, amount, fund_id, category_id, note, occurred_at, source, recurring_rule_id)
  values (r.user_id, 'expense', coalesce(p_amount, r.amount), r.fund_id,
          public.fn_bill_category(r.user_id, r.category_id), r.name, v_paid_at, 'web', r.id)
  returning id into v_tx;

  v_next := public.fn_bill_next_due(r.next_run_on, v_paid_on, r.day_of_month, r.interval_months);
  update public.recurring_rules set next_run_on = v_next where id = r.id;

  return jsonb_build_object(
    'transaction_id', v_tx,
    'amount', coalesce(p_amount, r.amount),
    'next_run_on', v_next
  );
end;
$$;

create or replace function public.fn_mark_bill_paid(p_rule_id uuid, p_chat_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_tx uuid;
  v_today date;
begin
  select rr.* into r
  from public.recurring_rules rr
  join public.profiles p on p.id = rr.user_id
  where rr.id = p_rule_id and rr.kind = 'bill' and p.telegram_chat_id = p_chat_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  v_today := public.fn_today(r.user_id);

  insert into public.transactions (user_id, type, amount, fund_id, category_id, note, occurred_at, source, recurring_rule_id)
  values (r.user_id, 'expense', r.amount, r.fund_id,
          public.fn_bill_category(r.user_id, r.category_id), r.name, public.fn_now(), 'telegram', r.id)
  returning id into v_tx;

  update public.recurring_rules
     set next_run_on = public.fn_bill_next_due(r.next_run_on, v_today, r.day_of_month, r.interval_months)
   where id = r.id;

  return jsonb_build_object('status', 'ok', 'transaction_id', v_tx, 'name', r.name, 'amount', r.amount);
end;
$$;

-- create or replace view chỉ cho thêm cột ở cuối: interval_months đặt sau paid_this_month.
create or replace view public.v_bills
with (security_invoker = true)
as
select
  r.id, r.user_id, r.name, r.amount, r.fund_id, r.category_id, r.day_of_month,
  r.next_run_on, r.active, r.created_at,
  d.today,
  (r.next_run_on - d.today) as days_left,
  p.last_paid_at,
  p.last_paid_amount,
  (p.last_paid_at is not null
    and p.last_paid_at >= public.fn_local_start(date_trunc('month', d.today)::date, public.fn_user_tz(r.user_id))
  ) as paid_this_month,
  r.interval_months
from public.recurring_rules r
cross join lateral (select public.fn_today(r.user_id) as today) d
left join lateral (
  select t.occurred_at as last_paid_at, t.amount as last_paid_amount
  from public.transactions t
  where t.recurring_rule_id = r.id and t.type = 'expense'
  order by t.occurred_at desc
  limit 1
) p on true
where r.kind = 'bill';
