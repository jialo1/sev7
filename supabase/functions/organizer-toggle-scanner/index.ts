// Active/désactive un scanner enfant. Caller doit être l'organizer parent
// (ou admin). Désactivation = ban de 100 ans côté auth.
import { json, originGuard, preflight } from '../_shared/cors.ts'
import { consumeRateLimit, RATE_LIMITS, clientIp } from '../_shared/rateLimit.ts'
import { logAudit } from '../_shared/audit.ts'
import { requireOrganizerOrAdmin } from '../_shared/guard.ts'

const FAR_FUTURE = '876000h' // ~100 ans

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const blocked = originGuard(req)
  if (blocked) return blocked
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, { status: 405 })
  }

  const guard = await requireOrganizerOrAdmin(req)
  if ('error' in guard) return guard.error
  const { user, sb, role } = guard

  const rl = consumeRateLimit(
    `organizer-toggle-scanner:${user.id}:${clientIp(req)}`,
    RATE_LIMITS.organizerToggleScanner.max,
    RATE_LIMITS.organizerToggleScanner.windowMs,
  )
  if (!rl.ok) {
    return json(
      { error: 'rate_limited', retry_after_sec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { scanner_id, action } = await req.json()
  if (typeof scanner_id !== 'string' || (action !== 'enable' && action !== 'disable' && action !== 'delete')) {
    return json({ error: 'invalid_payload' }, { status: 400 })
  }

  const { data: scanner } = await sb
    .from('profiles')
    .select('id, role, parent_organizer_id')
    .eq('id', scanner_id)
    .maybeSingle()

  if (!scanner || scanner.role !== 'scanner') {
    return json({ error: 'scanner_not_found' }, { status: 404 })
  }
  if (role === 'organizer' && scanner.parent_organizer_id !== user.id) {
    return json({ error: 'not_owner' }, { status: 403 })
  }

  if (action === 'delete') {
    const { error: delErr } = await sb.auth.admin.deleteUser(scanner_id)
    if (delErr) return json({ error: delErr.message }, { status: 500 })

    await logAudit(sb, req, user, {
      action: 'organizer.scanner_deleted',
      resource_type: 'user',
      resource_id: scanner_id,
      actor_role: role,
    })
    return json({ ok: true, deleted: true })
  }

  const { error: updErr } = await sb.auth.admin.updateUserById(scanner_id, {
    ban_duration: action === 'disable' ? FAR_FUTURE : 'none',
  })
  if (updErr) return json({ error: updErr.message }, { status: 500 })

  await logAudit(sb, req, user, {
    action:
      action === 'disable'
        ? 'organizer.scanner_disabled'
        : 'organizer.scanner_enabled',
    resource_type: 'user',
    resource_id: scanner_id,
    actor_role: role,
  })

  return json({ ok: true, action })
})
