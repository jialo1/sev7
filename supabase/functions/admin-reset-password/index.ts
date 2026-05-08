// Reset password par l'admin. 2 modes :
// - { user_id, password }       → set un nouveau mot de passe directement
// - { user_id, mode: 'magic' }  → envoie un magic link pour que l'user le change
import { json, preflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/guard.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 })

  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error
  const sb = guard.sb

  const { user_id, password, mode } = await req.json()
  if (typeof user_id !== 'string') {
    return json({ error: 'invalid_user_id' }, { status: 400 })
  }

  if (mode === 'magic') {
    // Envoyer un magic link (recovery)
    const { data: u } = await sb.auth.admin.getUserById(user_id)
    const email = u.user?.email
    if (!email) return json({ error: 'user_email_unknown' }, { status: 400 })

    const { data, error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (error) return json({ error: error.message }, { status: 500 })
    return json({ ok: true, action_link: data.properties?.action_link ?? null })
  }

  // Mode direct : set new password
  if (typeof password !== 'string' || password.length < 6) {
    return json({ error: 'password_too_short' }, { status: 400 })
  }

  const { error } = await sb.auth.admin.updateUserById(user_id, { password })
  if (error) return json({ error: error.message }, { status: 400 })

  return json({ ok: true })
})
