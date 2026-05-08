-- SEV7 — initial schema
-- All amounts in XOF (F CFA), no decimals.

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ─────────────────────────────────────────── PROFILES ───────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer'
    check (role in ('customer', 'staff', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────── VENUES & EVENTS ───────────────────────────────────
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kind text not null check (kind in ('club', 'restaurant')),
  name text not null,
  city text not null,
  svg_viewbox text default '0 0 900 520',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  title text not null,
  room_label text not null,
  starts_at timestamptz not null,
  poster_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  currency text not null default 'XOF',
  created_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events (starts_at);
create index events_venue_idx on public.events (venue_id);

-- ─────────────────────────────────────────── TABLES ────────────────────────────────────────────
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  label text not null,
  capacity int not null check (capacity > 0),
  zone text not null,
  price_xof int not null check (price_xof >= 0),
  x int not null,
  y int not null,
  w int not null,
  h int not null,
  rx int not null default 8,
  variant text default 'standard' check (variant in ('standard', 'vip')),
  unique (venue_id, label)
);

create index tables_venue_idx on public.tables (venue_id);

-- ─────────────────────────────────────────── BOOKINGS ──────────────────────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  party_size int not null default 1 check (party_size > 0),
  starts_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'reserved', 'paid', 'cancelled', 'attended', 'expired')),
  payment_method text check (payment_method in (
    'cinetpay_wave', 'cinetpay_om', 'cinetpay_cb', 'on_site'
  )),
  qr_token_hash text,
  hold_expires_at timestamptz,
  total_xof int not null default 0 check (total_xof >= 0),
  created_at timestamptz not null default now()
);

create index bookings_user_idx on public.bookings (user_id);
create index bookings_event_idx on public.bookings (event_id);
create index bookings_status_idx on public.bookings (status);

-- One active booking per (event, table)
create unique index bookings_active_seat_idx
  on public.bookings (event_id, table_id)
  where status in ('pending', 'reserved', 'paid', 'attended');

-- For restaurant (no event): unique per (table, day) via a generated column
-- (timestamptz::date is STABLE, but `at time zone 'UTC'` then ::date is IMMUTABLE)
alter table public.bookings
  add column starts_on date
    generated always as ((starts_at at time zone 'UTC')::date) stored;

create unique index bookings_active_resto_idx
  on public.bookings (venue_id, table_id, starts_on)
  where event_id is null and status in ('pending', 'reserved', 'paid', 'attended');

-- ─────────────────────────────────────────── MENU ──────────────────────────────────────────────
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  sort int not null default 0
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price_xof int not null check (price_xof >= 0),
  image_url text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create index menu_items_cat_idx on public.menu_items (category_id);

-- ─────────────────────────────────────────── ORDERS ────────────────────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  table_id uuid not null references public.tables(id),
  venue_id uuid not null references public.venues(id),
  status text not null default 'placed'
    check (status in ('placed', 'preparing', 'served', 'billed', 'cancelled')),
  total_xof int not null default 0 check (total_xof >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index orders_booking_idx on public.orders (booking_id);
create index orders_status_idx on public.orders (status);
create index orders_venue_idx on public.orders (venue_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  qty int not null check (qty > 0),
  unit_price_xof int not null check (unit_price_xof >= 0),
  note text
);

create index order_items_order_idx on public.order_items (order_id);

-- ─────────────────────────────────────────── PAYMENT INTENTS ───────────────────────────────────
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null default 'cinetpay',
  provider_ref text,
  amount_xof int not null check (amount_xof >= 0),
  currency text not null default 'XOF',
  status text not null default 'initiated'
    check (status in ('initiated', 'pending', 'accepted', 'refused', 'cancelled')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_intents_booking_idx on public.payment_intents (booking_id);

-- ─────────────────────────────────────────── REALTIME ──────────────────────────────────────────
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.orders;

-- ─────────────────────────────────────────── HOLD EXPIRATION JOB ───────────────────────────────
create or replace function public.expire_pending_holds()
returns void
language plpgsql
security definer
as $$
begin
  update public.bookings
  set status = 'expired'
  where status = 'pending'
    and hold_expires_at is not null
    and hold_expires_at < now();
end;
$$;

select cron.schedule(
  'expire-pending-holds',
  '* * * * *',
  $$select public.expire_pending_holds();$$
);

-- ─────────────────────────────────────────── RLS ───────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.tables enable row level security;
alter table public.bookings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_intents enable row level security;

-- profiles
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_staff_select" on public.profiles
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  ));
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- public catalog
create policy "venues_public_select" on public.venues
  for select using (true);
create policy "events_public_select" on public.events
  for select using (status = 'published');
create policy "tables_public_select" on public.tables
  for select using (true);
create policy "menu_categories_public_select" on public.menu_categories
  for select using (true);
create policy "menu_items_public_select" on public.menu_items
  for select using (available = true);

-- bookings: holds & paid bookings are created via Edge Function; users see their own; staff see all
create policy "bookings_owner_select" on public.bookings
  for select using (auth.uid() = user_id);
create policy "bookings_staff_select" on public.bookings
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  ));
-- Direct client inserts/updates blocked; Edge Function uses service role.

-- orders: customer of paid booking can read own + insert; staff manages
create policy "orders_owner_select" on public.orders
  for select using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.user_id = auth.uid()
  ));
create policy "orders_staff_select" on public.orders
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  ));
create policy "orders_owner_insert" on public.orders
  for insert with check (exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and b.user_id = auth.uid()
      and b.status in ('reserved', 'paid', 'attended')
  ));
create policy "orders_staff_update" on public.orders
  for update using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  ));

create policy "order_items_owner_select" on public.order_items
  for select using (exists (
    select 1
    from public.orders o
    join public.bookings b on b.id = o.booking_id
    where o.id = order_id and b.user_id = auth.uid()
  ));
create policy "order_items_staff_select" on public.order_items
  for select using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  ));
create policy "order_items_owner_insert" on public.order_items
  for insert with check (exists (
    select 1
    from public.orders o
    join public.bookings b on b.id = o.booking_id
    where o.id = order_id and b.user_id = auth.uid()
  ));

-- payment_intents: only Edge Function (service role) writes; users read own
create policy "payment_intents_owner_select" on public.payment_intents
  for select using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.user_id = auth.uid()
  ));
