-- Module Hoá đơn định kỳ: hoá đơn là recurring_rules kind = 'bill' (đã có từ schema lõi).
-- Thêm view v_bills (hạn tới, số ngày còn lại, lần trả gần nhất), hàm fn_pay_bill cho web,
-- và tách helper dùng chung với nút "Đánh dấu đã trả" của bot.

-- Hoá đơn bắt buộc có tên (quy tắc chuyển quỹ thì không).
alter table public.recurring_rules
  add constraint recurring_bill_needs_name check (kind <> 'bill' or char_length(btrim(coalesce(name, ''))) > 0);

-- Danh mục ghi chi cho hoá đơn: danh mục đã chọn → "Hoá đơn" → danh mục chi cuối cùng.
create or replace function public.fn_bill_category(p_user uuid, p_category uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select c.id from public.categories c where c.id = p_category and c.user_id = p_user and c.type = 'expense'),
    (select c.id from public.categories c where c.user_id = p_user and c.type = 'expense' and c.name = 'Hoá đơn'),
    (select c.id from public.categories c where c.user_id = p_user and c.type = 'expense' order by c.sort_order desc limit 1)
  );
$$;

-- Hạn tới sau khi trả: ngày đến hạn đầu tiên SAU max(hạn hiện tại, ngày trả).
-- Trả sớm → sang tháng sau hạn; trả trễ nhiều tháng → hạn gần nhất sau hôm nay, không dồn nợ cũ.
create or replace function public.fn_bill_next_due(p_due date, p_paid_on date, p_day int)
returns date
language sql
immutable
set search_path = ''
as $$
  select public.fn_next_salary_date(greatest(p_due, p_paid_on), p_day);
$$;

-- Web: người dùng tự đánh dấu đã trả, có thể sửa số tiền thật và thời điểm trả.
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

  v_next := public.fn_bill_next_due(r.next_run_on, v_paid_on, r.day_of_month);
  update public.recurring_rules set next_run_on = v_next where id = r.id;

  return jsonb_build_object(
    'transaction_id', v_tx,
    'amount', coalesce(p_amount, r.amount),
    'next_run_on', v_next
  );
end;
$$;

-- Bot: cùng quy tắc với web (trước đây dồn hạn +1 tháng kể cả khi đã trễ nhiều tháng).
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
     set next_run_on = public.fn_bill_next_due(r.next_run_on, v_today, r.day_of_month)
   where id = r.id;

  return jsonb_build_object('status', 'ok', 'transaction_id', v_tx, 'name', r.name, 'amount', r.amount);
end;
$$;

-- Hoá đơn kèm số ngày tới hạn và lần trả gần nhất (giao dịch gắn recurring_rule_id).
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
  ) as paid_this_month
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

comment on view public.v_bills is 'Hoá đơn định kỳ: days_left âm = quá hạn; paid_this_month theo tháng hiện tại giờ người dùng.';

-- ── Quyền ──────────────────────────────────────────────────────────────────
revoke execute on function public.fn_pay_bill(uuid, numeric, timestamptz) from public, anon;
grant execute on function public.fn_pay_bill(uuid, numeric, timestamptz) to authenticated;

grant select on public.v_bills to authenticated, service_role;
revoke all on public.v_bills from anon;
