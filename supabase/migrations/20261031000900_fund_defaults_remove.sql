-- Quỹ mặc định cho người dùng mới: Sinh hoạt (mặc định) + Tiết kiệm + Quỹ khẩn cấp.
-- Người dùng tự xoá được: fn_remove_fund xoá hẳn quỹ chưa dùng, quỹ đã có lịch sử thì lưu trữ;
-- quỹ mặc định phải chuyển cờ sang quỹ khác (fn_set_default_fund) trước.
-- Không seed lại cho tài khoản cũ, để không hồi sinh quỹ / danh mục người dùng đã xoá.

create or replace function public.seed_user_defaults(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, name, icon, color, type, sort_order)
  values
    (p_user, 'Ăn uống', 'utensils', 'sky', 'expense', 0),
    (p_user, 'Đi lại', 'car', 'violet', 'expense', 1),
    (p_user, 'Mua sắm', 'shopping-bag', 'orange', 'expense', 2),
    (p_user, 'Hoá đơn', 'zap', 'green', 'expense', 3),
    (p_user, 'Giải trí', 'clapperboard', 'pink', 'expense', 4),
    (p_user, 'Sức khoẻ', 'heart-pulse', 'red', 'expense', 5),
    (p_user, 'Giáo dục', 'graduation-cap', 'yellow', 'expense', 6),
    (p_user, 'Khác', 'circle-ellipsis', 'slate', 'expense', 7),
    (p_user, 'Lương', 'banknote', 'green', 'income', 0),
    (p_user, 'Thưởng', 'gift', 'yellow', 'income', 1),
    (p_user, 'Khác', 'circle-ellipsis', 'slate', 'income', 2)
  on conflict (user_id, type, name) do nothing;

  if not exists (select 1 from public.funds where user_id = p_user) then
    insert into public.funds (user_id, name, icon, color, kind, is_default, sort_order)
    values
      (p_user, 'Sinh hoạt', 'wallet', 'sky', 'monthly_budget', true, 0),
      (p_user, 'Tiết kiệm', 'piggy-bank', 'green', 'free', false, 1),
      (p_user, 'Quỹ khẩn cấp', 'shield', 'orange', 'free', false, 2);
  end if;
end;
$$;

revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;

-- Chuyển cờ mặc định (Telegram, hoá đơn, nguồn tự góp dùng quỹ này) sang quỹ khác.
-- Quỹ mục tiêu không làm mặc định được: tiền chi hằng ngày không trừ vào mục tiêu.
create or replace function public.fn_set_default_fund(p_fund_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  f public.funds;
begin
  select * into f from public.funds where id = p_fund_id and user_id = (select auth.uid());
  if not found then
    raise exception 'fund_not_found' using errcode = 'P0002';
  end if;
  if f.archived_at is not null or f.kind = 'goal' then
    raise exception 'fund_cannot_be_default' using errcode = '23514';
  end if;
  if f.is_default then
    return;
  end if;
  -- Bỏ cờ cũ trước: funds_one_default_per_user chỉ cho một quỹ mặc định tại mỗi thời điểm.
  update public.funds set is_default = false where user_id = f.user_id and is_default;
  update public.funds set is_default = true where id = f.id;
end;
$$;

-- Xoá quỹ: chưa dùng thì xoá hẳn; đã có giao dịch, hoá đơn hoặc là nguồn tự góp của quỹ khác
-- thì lưu trữ để giữ lịch sử số dư. Trả 'deleted' hoặc 'archived'.
create or replace function public.fn_remove_fund(p_fund_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  f public.funds;
begin
  select * into f from public.funds where id = p_fund_id and user_id = (select auth.uid());
  if not found then
    raise exception 'fund_not_found' using errcode = 'P0002';
  end if;
  if f.is_default then
    raise exception 'default_fund_protected' using errcode = '23514';
  end if;
  if exists (select 1 from public.transactions t where t.fund_id = f.id or t.to_fund_id = f.id)
    or exists (select 1 from public.recurring_rules r where r.kind = 'bill' and r.fund_id = f.id)
    or exists (select 1 from public.funds o where o.auto_from_fund_id = f.id)
  then
    update public.funds set archived_at = public.fn_now() where id = f.id;
    return 'archived';
  end if;
  delete from public.funds where id = f.id;
  return 'deleted';
end;
$$;

-- ── Quyền ──────────────────────────────────────────────────────────────────
revoke execute on function public.fn_set_default_fund(uuid) from public, anon;
grant execute on function public.fn_set_default_fund(uuid) to authenticated;
revoke execute on function public.fn_remove_fund(uuid) from public, anon;
grant execute on function public.fn_remove_fund(uuid) to authenticated;
