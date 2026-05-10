// 'Sur place' : 1er appel par le client passe le booking de 'pending' → 'reserved'.
// 2e appel par un staff (action: 'admin_confirm') passe 'reserved' → 'paid' et émet le QR.
import { json, originGuard, preflight } from '../_shared/cors.ts'
import { consumeRateLimit, RATE_LIMITS, clientIp } from '../_shared/rateLimit.ts'
import { logAudit } from '../_shared/audit.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const blocked = originGuard(req)
  if (blocked) return blocked

  const user = await userFromAuthHeader(req)
  if (!user) return json({ error: 'unauthorized' }, { status: 401 })

  const rl = consumeRateLimit(
    `confirm-onsite:${user.id}:${clientIp(req)}`,
    RATE_LIMITS.confirmOnsite.max,
    RATE_LIMITS.confirmOnsite.windowMs,
  )
  if (!rl.ok) {
    return json(
      { error: 'rate_limited', retry_after_sec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { booking_id, action } = await req.json()
  if (!booking_id) return json({ error: 'missing_booking_id' }, { status: 400 })

  const sb = adminClient()

  if (action === 'admin_confirm') {
    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return json({ error: 'forbidden' }, { status: 403 })
    }
    const { error } = await sb
      .from('bookings')
      .update({ status: 'paid' })
      .eq('id', booking_id)
      .eq('status', 'reserved')
    if (error) return json({ error: error.message }, { status: 500 })

    await logAudit(sb, req, user, {
      action: 'booking.confirm_onsite_paid',
      resource_type: 'booking',
      resource_id: booking_id,
      actor_role: profile.role,
    })
    sb.functions
      .invoke('send-booking-confirmation', { body: { booking_id } })
      .catch(() => {})
    return json({ ok: true, status: 'paid' })
  }

  const { error } = await sb
    .from('bookings')
    .update({
      status: 'reserved',
      payment_method: 'on_site',
      hold_expires_at: null,
    })
    .eq('id', booking_id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
  if (error) return json({ error: error.message }, { status: 500 })

  await logAudit(sb, req, user, {
    action: 'booking.reserved_onsite',
    resource_type: 'booking',
    resource_id: booking_id,
  })
  sb.functions
    .invoke('send-booking-confirmation', { body: { booking_id } })
    .catch(() => {})

  return json({ ok: true, status: 'reserved' })
})
