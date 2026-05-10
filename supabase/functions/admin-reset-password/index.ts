// Reset password par l'admin. 2 modes :
// - { user_id, password }       → set un nouveau mot de passe directement
// - { user_id, mode: 'magic' }  → envoie un magic link pour que l'user le change
import { json, originGuard, preflight } from '../_shared/cors.ts'
import { consumeRateLimit, RATE_LIMITS, clientIp } from '../_shared/rateLimit.ts'
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

  const rl = consumeRateLimit(
    `admin-reset-password:${caller.id}:${clientIp(req)}`,
    RATE_LIMITS.adminResetPassword.max,
    RATE_LIMITS.adminResetPassword.windowMs,
  )
  if (!rl.ok) {
    return json(
      { error: 'rate_limited', retry_after_sec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { user_id, password, mode } = await req.json()
  if (typeof user_id !== 'string') {
    return json({ error: 'invalid_user_id' }, { status: 400 })
  }

  if (mode === 'magic') {
    const { data: u } = await sb.auth.admin.getUserById(user_id)
    const email = u.user?.email
    if (!email) return json({ error: 'user_email_unknown' }, { status: 400 })

    const { data, error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (error) return json({ error: error.message }, { status: 500 })

    await logAudit(sb, req, caller, {
      action: 'admin.password_reset_magic',
      resource_type: 'user',
      resource_id: user_id,
      actor_role: 'admin',
    })

    return json({ ok: true, action_link: data.properties?.action_link ?? null })
  }

  if (typeof password !== 'string' || password.length < 6) {
    return json({ error: 'password_too_short' }, { status: 400 })
  }

  const { error } = await sb.auth.admin.updateUserById(user_id, { password })
  if (error) return json({ error: error.message }, { status: 400 })

  await logAudit(sb, req, caller, {
    action: 'admin.password_reset_direct',
    resource_type: 'user',
    resource_id: user_id,
    actor_role: 'admin',
  })

  return json({ ok: true })
})
