-- Tổng chi / thu theo tháng cho biểu đồ cột ở trang Chi tiêu: p_months tháng liên tiếp kết thúc tại p_month,
-- tính theo giờ người dùng (cùng ranh giới tháng với fn_month_summary).

create or replace function public.fn_monthly_totals(p_user_id uuid, p_month date, p_months int default 6)
returns table (month_start date, expense numeric(14, 0), income numeric(14, 0))
language sql
stable
security invoker
set search_path = ''
as $$
  with b as (
    select
      public.fn_user_tz(p_user_id) as tz,
      (date_trunc('month', p_month) - make_interval(months => greatest(p_months, 1) - 1))::date as m0,
      date_trunc('month', p_month)::date as m_last
  ),
  months as (
    select generate_series(b.m0, b.m_last, interval '1 month')::date as m, b.tz
    from b
  ),
  tx as (
    select t.type, t.amount, t.occurred_at
    from public.transactions t, b
    where t.user_id = p_user_id
      and t.type in ('expense', 'income')
      and t.occurred_at >= public.fn_local_start(b.m0, b.tz)
      and t.occurred_at < public.fn_local_start((b.m_last + interval '1 month')::date, b.tz)
  )
  select
    months.m,
    coalesce(sum(tx.amount) filter (where tx.type = 'expense'), 0)::numeric(14, 0),
    coalesce(sum(tx.amount) filter (where tx.type = 'income'), 0)::numeric(14, 0)
  from months
  left join tx
    on tx.occurred_at >= public.fn_local_start(months.m, months.tz)
   and tx.occurred_at < public.fn_local_start((months.m + interval '1 month')::date, months.tz)
  group by months.m
  order by months.m;
$$;

comment on function public.fn_monthly_totals(uuid, date, int) is 'Tổng chi/thu từng tháng, p_months tháng kết thúc tại p_month, theo giờ người dùng.';

revoke execute on function public.fn_monthly_totals(uuid, date, int) from public, anon;
grant execute on function public.fn_monthly_totals(uuid, date, int) to authenticated;
