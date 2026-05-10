// Création d'un scanner par un organizer (ou admin) — respecte le quota
// max_scanners du parent.
import { json, originGuard, preflight } from '../_shared/cors.ts'
import { consumeRateLimit, RATE_LIMITS, clientIp } from '../_shared/rateLimit.ts'
import { logAudit } from '../_shared/audit.ts'
import { requireOrganizerOrAdmin } from '../_shared/guard.ts'

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
  const { user, sb, role, maxScanners } = guard

  const rl = consumeRateLimit(
    `organizer-create-scanner:${user.id}:${clientIp(req)}`,
    RATE_LIMITS.organizerCreateScanner.max,
    RATE_LIMITS.organizerCreateScanner.windowMs,
  )
  if (!rl.ok) {
    return json(
      { error: 'rate_limited', retry_after_sec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const body = await req.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : null
  const parentIdInput = typeof body.parent_organizer_id === 'string'
    ? body.parent_organizer_id
    : null

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_email' }, { status: 400 })
  }
  if (password.length < 6) {
    return json({ error: 'password_too_short' }, { status: 400 })
  }

  // Organizer crée des scanners pour SOI ; admin peut spécifier un parent.
  let parentOrganizerId: string
  if (role === 'admin') {
    parentOrganizerId = parentIdInput ?? user.id
  } else {
    parentOrganizerId = user.id
  }

  // Vérifier le quota du parent.
  const { data: parent } = await sb
    .from('profiles')
    .select('id, role, max_scanners')
    .eq('id', parentOrganizerId)
    .maybeSingle()

  if (!parent || (parent.role !== 'organizer' && parent.role !== 'admin')) {
    return json({ error: 'invalid_parent' }, { status: 400 })
  }

  const quota = role === 'admin' && parent.role === 'admin'
    ? Number.MAX_SAFE_INTEGER
    : (parent.max_scanners ?? maxScanners)

  const { count: childrenCount } = await sb
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('parent_organizer_id', parentOrganizerId)
    .eq('role', 'scanner')

  if ((childrenCount ?? 0) >= quota) {
    return json({ error: 'quota_reached', quota }, { status: 409 })
  }

  // Créer le user auth.
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  })
  if (createErr) return json({ error: createErr.message }, { status: 400 })
  if (!created.user) return json({ error: 'create_failed' }, { status: 500 })

  // Forcer rôle scanner + parent + nom.
  const updates: Record<string, unknown> = {
    role: 'scanner',
    parent_organizer_id: parentOrganizerId,
  }
  if (fullName) updates.full_name = fullName

  const { error: profileErr } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', created.user.id)
  if (profileErr) {
    // Best effort rollback : delete auth user
    await sb.auth.admin.deleteUser(created.user.id)
    return json({ error: profileErr.message }, { status: 500 })
  }

  await logAudit(sb, req, user, {
    action: 'organizer.scanner_created',
    resource_type: 'user',
    resource_id: created.user.id,
    actor_role: role,
    metadata: {
      target_email: email,
      parent_organizer_id: parentOrganizerId,
    },
  })

  return json({
    ok: true,
    scanner: {
      id: created.user.id,
      email,
      full_name: fullName,
      parent_organizer_id: parentOrganizerId,
    },
  })
})
