-- fn_pay_periods đếm bằng số học thay vì duyệt từng tháng bằng generate_series.
-- Hạn gõ nhầm năm (vd 202706-01-01) làm bản cũ sinh hơn 2 triệu dòng mỗi lần đọc v_fund_goal_progress,
-- vượt statement_timeout của Supabase và màn quỹ treo ở trạng thái tải.
-- Ngày lương tăng dần theo tháng nên các kỳ thoả p_from < d < p_to là một dãy tháng liên tiếp:
-- tháng đầu = tháng của p_from (hoặc tháng sau nếu ngày lương tháng đó chưa qua p_from),
-- tháng cuối = tháng của p_to (hoặc tháng trước nếu ngày lương tháng đó không trước p_to).
create or replace function public.fn_pay_periods(p_from date, p_to date, p_day int)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when p_to is null or p_to <= p_from then 0 else (
    select greatest(
      0,
      (extract(year from x.last_m) - extract(year from x.first_m)) * 12
        + extract(month from x.last_m) - extract(month from x.first_m) + 1
    )::int
    from (
      select
        case when public.fn_salary_date(p_from, p_day) > p_from
          then date_trunc('month', p_from)
          else date_trunc('month', p_from) + interval '1 month'
        end as first_m,
        case when public.fn_salary_date(p_to, p_day) < p_to
          then date_trunc('month', p_to)
          else date_trunc('month', p_to) - interval '1 month'
        end as last_m
    ) x
  ) end;
$$;
