-- 0006 — Journal d'audit pour les actions admin / organizer / système.
-- Best-effort : un échec d'écriture ne doit jamais bloquer l'action métier.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc)
  where actor_id is not null;

create index audit_logs_resource_idx
  on public.audit_logs (resource_type, resource_id, created_at desc)
  where resource_id is not null;

create index audit_logs_created_idx
  on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- Lecture admin uniquement.
create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.current_user_role() = 'admin');

-- Pas de policy d'INSERT/UPDATE/DELETE : les Edge Functions écrivent via
-- service role (bypass RLS). Aucun client direct ne peut polluer le log.
