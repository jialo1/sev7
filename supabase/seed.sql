-- Seed dev data: SEV7 Dakar club + restaurant + sample events with posters

insert into public.venues (id, slug, kind, name, city, svg_viewbox)
values
  ('11111111-1111-1111-1111-111111111111', 'club', 'club', 'SEV7', 'Dakar', '0 0 900 520'),
  ('22222222-2222-2222-2222-222222222222', 'restaurant', 'restaurant', 'SEV7 Resto', 'Dakar', '0 0 900 520')
on conflict (slug) do nothing;

-- Three sample events with posters (Unsplash placeholders, replace via admin later)
insert into public.events (id, venue_id, title, room_label, starts_at, status, poster_url)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Afro House — Invité DJ',
    'Espace principal',
    now() + interval '14 days' + interval '23 hours',
    'published',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333334',
    '11111111-1111-1111-1111-111111111111',
    'Hip Hop Night',
    'Espace VIP',
    now() + interval '21 days' + interval '23 hours' + interval '30 minutes',
    'published',
    'https://images.unsplash.com/photo-1571266028243-d220c6a9c0bb?w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333335',
    '11111111-1111-1111-1111-111111111111',
    'Soirée Electro',
    'Espace principal',
    now() + interval '7 days' + interval '23 hours',
    'published',
    'https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=800&q=80'
  )
on conflict do nothing;

-- Club tables
insert into public.tables (venue_id, label, capacity, zone, price_xof, x, y, w, h, rx, variant) values
  ('11111111-1111-1111-1111-111111111111', 'T1', 4, 'Mezzanine', 80000, 72, 48, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T2', 4, 'Mezzanine', 80000, 168, 48, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T3', 6, 'Mezzanine', 120000, 264, 40, 88, 60, 10, 'vip'),
  ('11111111-1111-1111-1111-111111111111', 'T4', 2, 'Mezzanine', 45000, 380, 52, 56, 48, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T5', 4, 'Côté bar', 65000, 460, 40, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T6', 4, 'Côté bar', 65000, 556, 48, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T7', 8, 'VIP', 210000, 660, 36, 112, 68, 12, 'vip'),
  ('11111111-1111-1111-1111-111111111111', 'T8', 4, 'Piste', 90000, 100, 168, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T9', 4, 'Piste', 90000, 200, 176, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T10', 2, 'Piste', 50000, 308, 180, 56, 48, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T11', 6, 'Piste', 130000, 396, 164, 88, 60, 10, 'vip'),
  ('11111111-1111-1111-1111-111111111111', 'T12', 4, 'Piste', 90000, 512, 172, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T13', 4, 'Piste', 90000, 612, 168, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T14', 2, 'Foyer', 40000, 120, 288, 56, 48, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T15', 4, 'Foyer', 60000, 204, 280, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T16', 4, 'Foyer', 60000, 304, 284, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T17', 6, 'Foyer', 100000, 420, 272, 88, 60, 10, 'vip'),
  ('11111111-1111-1111-1111-111111111111', 'T18', 4, 'Foyer', 60000, 536, 280, 72, 52, 8, 'standard'),
  ('11111111-1111-1111-1111-111111111111', 'T19', 2, 'Foyer', 40000, 636, 288, 56, 48, 8, 'standard')
on conflict do nothing;

-- Menu (drinks for the club)
insert into public.menu_categories (id, venue_id, name, sort) values
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Champagnes', 1),
  ('aaaa1111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Spiritueux', 2),
  ('aaaa1111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Cocktails', 3),
  ('aaaa1111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Sans alcool', 4)
on conflict do nothing;

insert into public.menu_items (category_id, name, description, price_xof, image_url) values
  ('aaaa1111-0000-0000-0000-000000000001', 'Moët Brut', 'Bouteille 75cl', 95000, 'https://images.unsplash.com/photo-1592073260317-bf7b78115280?w=400&q=80'),
  ('aaaa1111-0000-0000-0000-000000000001', 'Veuve Clicquot', 'Bouteille 75cl', 110000, 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400&q=80'),
  ('aaaa1111-0000-0000-0000-000000000002', 'Hennessy VSOP', 'Bouteille 70cl', 75000, 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400&q=80'),
  ('aaaa1111-0000-0000-0000-000000000002', 'Grey Goose', 'Bouteille 70cl', 70000, 'https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=400&q=80'),
  ('aaaa1111-0000-0000-0000-000000000003', 'Mojito', 'Rhum, menthe, citron', 7000, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&q=80'),
  ('aaaa1111-0000-0000-0000-000000000003', 'Margarita', 'Tequila, citron, sel', 7500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80'),
  ('aaaa1111-0000-0000-0000-000000000004', 'Bissap', 'Hibiscus glacé', 3000, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&q=80'),
  ('aaaa1111-0000-0000-0000-000000000004', 'Eau minérale', '50cl', 1500, 'https://images.unsplash.com/photo-1564725075388-cc5970130dab?w=400&q=80')
on conflict do nothing;
