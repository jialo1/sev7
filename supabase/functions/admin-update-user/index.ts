// Update d'un user par l'admin : email, full_name, phone, role.
// Le rôle passe par le même trigger (admin) du DB. Self-edit du caller bloqué
// pour éviter les self-locks.
import { json, preflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/guard.ts'

const ROLES = ['customer', 'scanner', 'staff', 'admin'] as const
type Role = (typeof ROLES)[number]

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 })

  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error
  const { user: caller, sb } = guard

  const { user_id, email, full_name, phone, role } = await req.json()
  if (typeof user_id !== 'string') {
    return json({ error: 'invalid_user_id' }, { status: 400 })
  }
  if (role && !ROLES.includes(role as Role)) {
    return json({ error: 'invalid_role' }, { status: 400 })
  }

  // Update auth.users (email)
  if (typeof email === 'string' && email.length > 3) {
    const { error } = await sb.auth.admin.updateUserById(user_id, { email })
    if (error) return json({ error: error.message }, { status: 400 })
  }

  // Update profiles (full_name, phone, role)
  const updates: Record<string, unknown> = {}
  if (typeof full_name === 'string' || full_name === null) updates.full_name = full_name
  if (typeof phone === 'string' || phone === null) updates.phone = phone
  if (role) {
    if (user_id === caller.id) {
      return json({ error: 'cannot_change_own_role' }, { status: 400 })
    }
    updates.role = role
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await sb.from('profiles').update(updates).eq('id', user_id)
    if (error) return json({ error: error.message }, { status: 500 })
  }

  return json({ ok: true })
})
