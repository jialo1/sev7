-- 0005 — Rôle "organizer" : un prestataire peut éditer ses propres soirées,
-- créer des comptes scanner sous son périmètre, voir ses stats.

-- ─────────────────────────────────────────── 1. Role + profile fields ─────────
alter table public.profiles
  drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'scanner', 'organizer', 'staff', 'admin'));

alter table public.profiles
  add column parent_organizer_id uuid references public.profiles(id) on delete set null,
  add column max_scanners int not null default 3 check (max_scanners >= 0),
  add column display_name text,
  add column photo_url text;

create index profiles_parent_organizer_idx
  on public.profiles (parent_organizer_id)
  where parent_organizer_id is not null;

-- ─────────────────────────────────────────── 2. Event ownership ───────────────
alter table public.events
  add column organizer_id uuid references public.profiles(id) on delete set null;

create index events_organizer_idx
  on public.events (organizer_id)
  where organizer_id is not null;

-- ─────────────────────────────────────────── 3. RLS — organizer scope ─────────
-- profiles : organizer voit ses scanners enfants
create policy "profiles_organizer_select_children" on public.profiles
  for select using (
    public.current_user_role() = 'organizer'
    and parent_organizer_id = auth.uid()
  );

-- events : organizer voit + édite SES events (incl. drafts)
create policy "events_organizer_select" on public.events
  for select using (
    public.current_user_role() = 'organizer'
    and organizer_id = auth.uid()
  );

create policy "events_organizer_write" on public.events
  for all using (
    public.current_user_role() = 'organizer'
    and organizer_id = auth.uid()
  )
  with check (
    public.current_user_role() = 'organizer'
    and organizer_id = auth.uid()
  );

-- bookings : organizer voit les bookings de ses events
create policy "bookings_organizer_select" on public.bookings
  for select using (
    public.current_user_role() = 'organizer'
    and event_id in (
      select id from public.events where organizer_id = auth.uid()
    )
  );

-- orders : organizer voit les commandes attachées à ses bookings
create policy "orders_organizer_select" on public.orders
  for select using (
    public.current_user_role() = 'organizer'
    and exists (
      select 1
      from public.bookings b
      join public.events e on e.id = b.event_id
      where b.id = orders.booking_id and e.organizer_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────── 4. Storage bucket "posters" ──────
-- Bucket public read pour les posters d'événement et photos d'organisateur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posters',
  'posters',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Lecture publique (le bucket est déjà public, mais on documente la policy)
create policy "posters_public_read" on storage.objects
  for select using (bucket_id = 'posters');

-- Upload : admin partout, organizer dans son préfixe (organizer/{auth.uid}/…)
create policy "posters_admin_write" on storage.objects
  for all
  using (bucket_id = 'posters' and public.current_user_role() = 'admin')
  with check (bucket_id = 'posters' and public.current_user_role() = 'admin');

create policy "posters_organizer_write" on storage.objects
  for all
  using (
    bucket_id = 'posters'
    and public.current_user_role() = 'organizer'
    and (storage.foldername(name))[1] = 'organizer'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'posters'
    and public.current_user_role() = 'organizer'
    and (storage.foldername(name))[1] = 'organizer'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
