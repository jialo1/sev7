-- 0002 — Espaces admin / scanner / client (rôles, audit, favoris, prefs, RLS admin)

-- ─────────────────────────────────────────── 1. Rôle scanner ───────────────────
alter table public.profiles
  drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'scanner', 'staff', 'admin'));

-- ─────────────────────────────────────────── 2. Audit scan ─────────────────────
alter table public.bookings
  add column scanned_by uuid references public.profiles(id),
  add column scanned_at timestamptz;

create index bookings_scanned_at_idx on public.bookings (scanned_at)
  where scanned_at is not null;

-- ─────────────────────────────────────────── 3. Préférences client ─────────────
alter table public.profiles
  add column email_notifications boolean not null default true,
  add column sms_notifications boolean not null default false,
  add column locale text not null default 'fr-SN';

-- Permettre au user d'éditer son propre profil (sauf le rôle, qui passe par Edge Function admin-set-role)
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- ─────────────────────────────────────────── 4. Favoris ────────────────────────
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.favorites enable row level security;

create policy "favorites_owner_all" on public.favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────── 5. Admin RLS — full write ─────────
create policy "events_admin_write" on public.events
  for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "venues_admin_write" on public.venues
  for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "tables_admin_write" on public.tables
  for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "menu_categories_admin_write" on public.menu_categories
  for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "menu_items_admin_write" on public.menu_items
  for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Admin peut update les bookings (cancel, refund metadata) — staff via Edge Function uniquement
create policy "bookings_admin_update" on public.bookings
  for update
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
