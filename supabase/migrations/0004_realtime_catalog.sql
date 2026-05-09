-- 0004 — Étend la publication realtime aux tables catalogue (events, menu_*)
-- pour que les modifications faites depuis l'admin se reflètent en direct
-- côté client (HomePage, EventsListPage, MenuPage).

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.menu_categories;
alter publication supabase_realtime add table public.tables;
