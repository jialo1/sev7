/**
 * Journal d'audit : best-effort. Un échec d'écriture ne doit jamais bloquer
 * l'action métier (try/catch, on log seulement en console).
 */
import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { clientIp } from './rateLimit.ts'

export type AuditPayload = {
  action: string
  resource_type: string
  resource_id?: string | null
  metadata?: Record<string, unknown> | null
  /** Override actor (sinon on lit depuis `user`). */
  actor_email?: string | null
  actor_role?: string | null
}

export async function logAudit(
  sb: SupabaseClient,
  req: Request | null,
  user: User | null,
  payload: AuditPayload,
): Promise<void> {
  try {
    await sb.from('audit_logs').insert({
      actor_id: user?.id ?? null,
      actor_email: payload.actor_email ?? user?.email ?? null,
      actor_role: payload.actor_role ?? null,
      action: payload.action,
      resource_type: payload.resource_type,
      resource_id: payload.resource_id ?? null,
      metadata: payload.metadata ?? null,
      ip: req ? clientIp(req) : null,
      user_agent: req?.headers.get('user-agent') ?? null,
    })
  } catch (e) {
    // Best-effort : on n'échoue pas l'action métier si l'audit casse.
    console.error('[audit] write failed', payload.action, e)
  }
}
