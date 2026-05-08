// admin-set-role : permet à un admin de modifier le rôle d'un autre utilisateur.
// Pas de self-promote possible (le caller ne peut pas changer son propre rôle).
import { json, preflight } from '../_shared/cors.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'

const ALLOWED_ROLES = ['customer', 'scanner', 'staff', 'admin'] as const
type Role = (typeof ALLOWED_ROLES)[number]

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, { status: 405 })
  }

  const caller = await userFromAuthHeader(req)
  if (!caller) return json({ error: 'unauthorized' }, { status: 401 })

  const sb = adminClient()
  const { data: callerProfile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return json({ error: 'forbidden' }, { status: 403 })
  }

  const { user_id, new_role } = await req.json()
  if (typeof user_id !== 'string' || !ALLOWED_ROLES.includes(new_role as Role)) {
    return json({ error: 'invalid_payload' }, { status: 400 })
  }

  if (user_id === caller.id) {
    return json({ error: 'cannot_change_own_role' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('profiles')
    .update({ role: new_role as Role })
    .eq('id', user_id)
    .select('id, role, full_name, phone')
    .maybeSingle()

  if (error) return json({ error: error.message }, { status: 500 })
  if (!data) return json({ error: 'user_not_found' }, { status: 404 })

  return json({ ok: true, profile: data })
})
