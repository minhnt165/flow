-- Countdown lặp theo chu kỳ tháng: repeat_months ∈ {1, 2, 3, 6, 12}, null = không lặp.
-- Nguồn sự thật là repeat_months. Cột cũ repeat_yearly giữ lại làm cột dẫn xuất (= repeat_months = 12)
-- và vẫn nhận ghi kiểu cũ (repeat_yearly = true → 12) để client / test cũ còn chạy.

alter table public.countdowns
  add column repeat_months int check (repeat_months in (1, 2, 3, 6, 12));

update public.countdowns set repeat_months = 12 where repeat_yearly;

comment on column public.countdowns.repeat_months is 'Chu kỳ lặp theo tháng (1, 2, 3, 6, 12); null = không lặp.';
comment on column public.countdowns.repeat_yearly is 'Dẫn xuất từ repeat_months (= 12); giữ để tương thích, sẽ bỏ sau.';

create or replace function public.countdowns_sync_repeat()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Ghi kiểu cũ: bật repeat_yearly mà không đặt repeat_months → hằng năm.
  if new.repeat_months is null and new.repeat_yearly
     and (tg_op = 'INSERT' or new.repeat_yearly is distinct from old.repeat_yearly) then
    new.repeat_months := 12;
  end if;
  -- Tắt lặp qua cột cũ.
  if tg_op = 'UPDATE' and not new.repeat_yearly and old.repeat_yearly
     and new.repeat_months is not distinct from old.repeat_months then
    new.repeat_months := null;
  end if;
  new.repeat_yearly := coalesce(new.repeat_months = 12, false);
  return new;
end;
$$;

create trigger countdowns_sync_repeat
  before insert or update on public.countdowns
  for each row execute function public.countdowns_sync_repeat();

-- Dời p_months tháng, giữ ngày trong tháng; tháng ngắn hơn lấy ngày cuối (31/01 + 1 tháng = 28/02).
create or replace function public.fn_shift_months(p_event date, p_months int)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(
    extract(year from x.m)::int,
    extract(month from x.m)::int,
    least(extract(day from p_event)::int, extract(day from (x.m + interval '1 month - 1 day'))::int)
  )
  from (select (date_trunc('month', p_event) + make_interval(months => p_months))::date as m) x;
$$;

-- Lần tới ≥ hôm nay của sự kiện lặp mỗi p_repeat_months tháng; không lặp hoặc chưa tới thì là event_date.
create or replace function public.fn_next_occurrence_on(p_event date, p_repeat_months int, p_today date)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when p_repeat_months is null or p_event >= p_today then p_event
    else (
      select case
        when public.fn_shift_months(p_event, x.k * p_repeat_months) >= p_today
          then public.fn_shift_months(p_event, x.k * p_repeat_months)
        else public.fn_shift_months(p_event, (x.k + 1) * p_repeat_months)
      end
      from (
        select (((extract(year from p_today) - extract(year from p_event)) * 12
                 + extract(month from p_today) - extract(month from p_event))::int / p_repeat_months) as k
      ) x
    )
  end;
$$;

-- Lần lặp ngay trước p_next (null nếu p_next là lần đầu hoặc không lặp): mốc bắt đầu vòng tiến độ.
create or replace function public.fn_prev_occurrence_on(p_event date, p_repeat_months int, p_next date)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when p_repeat_months is null or p_next <= p_event then null
    else public.fn_shift_months(
      p_event,
      ((extract(year from p_next) - extract(year from p_event)) * 12
        + extract(month from p_next) - extract(month from p_event))::int - p_repeat_months
    )
  end;
$$;

create or replace function public.fn_next_occurrence(c public.countdowns)
returns date
language sql
stable
set search_path = ''
as $$
  select public.fn_next_occurrence_on(c.event_date, c.repeat_months, public.fn_today(c.user_id));
$$;

drop function if exists public.fn_next_occurrence_on(date, boolean, date);

-- create or replace view chỉ cho thêm cột ở cuối: repeat_months đặt sau is_past.
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
      when b.repeat_months is not null and b.next_occurrence > b.event_date
        then greatest(b.created_on, public.fn_prev_occurrence_on(b.event_date, b.repeat_months, b.next_occurrence))
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
  (s.repeat_months is null and s.event_date < s.today) as is_past,
  s.repeat_months
from spans s;
