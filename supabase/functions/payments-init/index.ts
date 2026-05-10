// Initialise un paiement CinetPay pour un booking pending et renvoie l'URL hosted checkout.
// Doc CinetPay : https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation
import { json, originGuard, preflight } from '../_shared/cors.ts'
import { consumeRateLimit, RATE_LIMITS, clientIp } from '../_shared/rateLimit.ts'
import { logAudit } from '../_shared/audit.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'

const CINETPAY_URL = 'https://api-checkout.cinetpay.com/v2/payment'

const METHOD_CHANNELS: Record<string, string> = {
  cinetpay_wave: 'WAVE_SN',
  cinetpay_om: 'OM_SN',
  cinetpay_cb: 'CREDIT_CARD',
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const blocked = originGuard(req)
  if (blocked) return blocked

  const user = await userFromAuthHeader(req)
  if (!user) return json({ error: 'unauthorized' }, { status: 401 })

  const rl = consumeRateLimit(
    `payments-init:${user.id}:${clientIp(req)}`,
    RATE_LIMITS.paymentsInit.max,
    RATE_LIMITS.paymentsInit.windowMs,
  )
  if (!rl.ok) {
    return json(
      { error: 'rate_limited', retry_after_sec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { booking_id, method } = await req.json()
  if (!booking_id || !METHOD_CHANNELS[method]) {
    return json({ error: 'invalid_payload' }, { status: 400 })
  }

  const sb = adminClient()
  const { data: booking } = await sb
    .from('bookings')
    .select('id, total_xof, user_id, status, hold_expires_at')
    .eq('id', booking_id)
    .maybeSingle()
  if (!booking || booking.user_id !== user.id) {
    return json({ error: 'booking_not_found' }, { status: 404 })
  }
  if (booking.status !== 'pending') {
    return json({ error: 'booking_not_pending' }, { status: 400 })
  }

  const apiKey = Deno.env.get('CINETPAY_API_KEY')
  const siteId = Deno.env.get('CINETPAY_SITE_ID')
  const publicAppUrl = Deno.env.get('PUBLIC_APP_URL') ?? 'http://localhost:5173'
  const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payments-webhook`
  const returnUrl = `${publicAppUrl}/tickets/${booking.id}`

  // Mode mock pour dev : si CinetPay pas configuré, on simule un paiement
  // réussi (booking → paid) et on renvoie une URL qui ramène à /tickets/:id.
  if (!apiKey || !siteId) {
    await sb
      .from('bookings')
      .update({ payment_method: method, status: 'paid' })
      .eq('id', booking.id)
    await sb.from('payment_intents').insert({
      booking_id: booking.id,
      provider: 'mock',
      amount_xof: booking.total_xof,
      status: 'accepted',
      raw: { mock: true, reason: 'cinetpay_not_configured_dev_only' },
    })
    await logAudit(sb, req, user, {
      action: 'payment.mock_paid',
      resource_type: 'booking',
      resource_id: booking.id,
      metadata: { method, total_xof: booking.total_xof },
    })
    // Best-effort : envoie le mail de confirmation.
    sb.functions
      .invoke('send-booking-confirmation', { body: { booking_id: booking.id } })
      .catch(() => {})
    return json({ payment_url: returnUrl, mock: true })
  }

  const payload = {
    apikey: apiKey,
    site_id: siteId,
    transaction_id: booking.id,
    amount: booking.total_xof,
    currency: 'XOF',
    description: `SEV7 — Réservation ${booking.id.slice(0, 8)}`,
    notify_url: notifyUrl,
    return_url: returnUrl,
    channels: METHOD_CHANNELS[method],
    metadata: booking.id,
    customer_id: user.id,
    customer_email: user.email ?? '',
  }

  const res = await fetch(CINETPAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const cpJson = await res.json().catch(() => null)
  if (!res.ok || cpJson?.code !== '201') {
    return json({ error: 'cinetpay_init_failed', detail: cpJson }, { status: 502 })
  }

  await sb.from('payment_intents').insert({
    booking_id: booking.id,
    provider: 'cinetpay',
    provider_ref: cpJson.data?.payment_token ?? null,
    amount_xof: booking.total_xof,
    status: 'initiated',
    raw: cpJson,
  })

  await sb.from('bookings').update({ payment_method: method }).eq('id', booking.id)

  await logAudit(sb, req, user, {
    action: 'payment.initiated',
    resource_type: 'booking',
    resource_id: booking.id,
    metadata: { method, provider: 'cinetpay', total_xof: booking.total_xof },
  })

  return json({ payment_url: cpJson.data.payment_url })
})
