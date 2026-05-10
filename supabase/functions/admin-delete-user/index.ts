// Suppression d'un user par l'admin. ON DELETE CASCADE supprime profiles +
// bookings + favorites + orders associés (selon la migration 0001).
import { json, originGuard, preflight } from '../_shared/cors.ts'
import { logAudit } from '../_shared/audit.ts'
import { requireAdmin } from '../_shared/guard.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const blocked = originGuard(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 })

  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error
  const { user: caller, sb } = guard

  const { user_id } = await req.json()
  if (typeof user_id !== 'string') {
    return json({ error: 'invalid_user_id' }, { status: 400 })
  }
  if (user_id === caller.id) {
    return json({ error: 'cannot_delete_self' }, { status: 400 })
  }

  // Capture l'email cible pour l'audit avant suppression cascade
  const { data: target } = await sb
    .from('profiles')
    .select('full_name, role')
    .eq('id', user_id)
    .maybeSingle()

  const { error } = await sb.auth.admin.deleteUser(user_id)
  if (error) return json({ error: error.message }, { status: 400 })

  await logAudit(sb, req, caller, {
    action: 'admin.user_deleted',
    resource_type: 'user',
    resource_id: user_id,
    actor_role: 'admin',
    metadata: {
      target_role: target?.role ?? null,
      target_full_name: target?.full_name ?? null,
    },
  })

  return json({ ok: true })
})
