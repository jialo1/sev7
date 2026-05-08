// Suppression d'un user par l'admin. ON DELETE CASCADE supprime profiles +
// bookings + favorites + orders associés (selon la migration 0001).
import { json, preflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/guard.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
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

  const { error } = await sb.auth.admin.deleteUser(user_id)
  if (error) return json({ error: error.message }, { status: 400 })

  return json({ ok: true })
})
