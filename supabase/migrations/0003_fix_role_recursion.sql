-- 0003 — Fix infinite recursion in role-based RLS policies.
-- Cause : les policies utilisaient EXISTS (SELECT … FROM profiles WHERE …)
-- ce qui re-déclenche les policies SELECT de profiles → récursion.
-- Fix : helper function SECURITY DEFINER qui bypass la RLS.

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Permettre à tout le monde d'appeler la fonction (la security definer prend le relais)
grant execute on function public.current_user_role() to anon, authenticated;

-- ─── Réécriture des policies en remplaçant EXISTS(...) par current_user_role() ───

-- profiles
drop policy if exists "profiles_staff_select" on public.profiles;
create policy "profiles_staff_select" on public.profiles
  for select using (public.current_user_role() in ('staff', 'admin'));

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- Trigger qui empêche le user non-admin de changer son propre rôle
create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role) then
    if public.current_user_role() <> 'admin' then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.profiles_protect_role();

-- bookings
drop policy if exists "bookings_staff_select" on public.bookings;
create policy "bookings_staff_select" on public.bookings
  for select using (public.current_user_role() in ('staff', 'admin'));

drop policy if exists "bookings_admin_update" on public.bookings;
create policy "bookings_admin_update" on public.bookings
  for update using (public.current_user_role() = 'admin');

-- orders
drop policy if exists "orders_staff_select" on public.orders;
create policy "orders_staff_select" on public.orders
  for select using (public.current_user_role() in ('staff', 'admin'));

drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_staff_update" on public.orders
  for update using (public.current_user_role() in ('staff', 'admin'));

drop policy if exists "order_items_staff_select" on public.order_items;
create policy "order_items_staff_select" on public.order_items
  for select using (public.current_user_role() in ('staff', 'admin'));

-- catalogue admin write
drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write" on public.events
  for all using (public.current_user_role() = 'admin');

drop policy if exists "venues_admin_write" on public.venues;
create policy "venues_admin_write" on public.venues
  for all using (public.current_user_role() = 'admin');

drop policy if exists "tables_admin_write" on public.tables;
create policy "tables_admin_write" on public.tables
  for all using (public.current_user_role() = 'admin');

drop policy if exists "menu_categories_admin_write" on public.menu_categories;
create policy "menu_categories_admin_write" on public.menu_categories
  for all using (public.current_user_role() = 'admin');

drop policy if exists "menu_items_admin_write" on public.menu_items;
create policy "menu_items_admin_write" on public.menu_items
  for all using (public.current_user_role() = 'admin');
