-- Số dư ban đầu của quỹ: tiền đang có lúc tạo ví, cộng thẳng vào số dư,
-- không phải giao dịch nên không tính vào thu/chi tháng.
alter table public.funds
  add column opening_balance numeric(14, 0) not null default 0
  constraint funds_opening_balance_nonnegative check (opening_balance >= 0);

comment on column public.funds.opening_balance is 'Số dư lúc tạo quỹ; cộng vào balance của v_fund_balances, không tính vào thu/chi.';

-- create or replace view chỉ cho thêm cột ở cuối: opening_balance đặt sau balance.
create or replace view public.v_fund_balances
with (security_invoker = true)
as
select
  f.id, f.user_id, f.name, f.icon, f.color, f.kind, f.monthly_budget, f.target_amount, f.target_date,
  f.countdown_id, f.auto_contribution, f.auto_from_fund_id, f.is_default, f.sort_order, f.archived_at,
  f.created_at,
  (f.opening_balance + coalesce(b.balance, 0))::numeric(14, 0) as balance,
  f.opening_balance
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
