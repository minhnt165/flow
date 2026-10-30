-- Dữ liệu mặc định cho người dùng mới: 8 danh mục chi, 3 danh mục thu, quỹ Sinh hoạt (mặc định).

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

  if not exists (select 1 from public.funds where user_id = p_user and is_default) then
    insert into public.funds (user_id, name, icon, color, kind, is_default, sort_order)
    values (p_user, 'Sinh hoạt', 'wallet', 'sky', 'monthly_budget', true, 0);
  end if;
end;
$$;

revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  perform public.seed_user_defaults(new.id);
  return new;
end;
$$;

-- Người dùng đã đăng ký trước migration này cũng có dữ liệu mặc định.
do $$
declare
  u record;
begin
  for u in select p.id from public.profiles p loop
    perform public.seed_user_defaults(u.id);
  end loop;
end;
$$;
