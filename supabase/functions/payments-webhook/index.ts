// Webhook CinetPay : on (re)vérifie la transaction côté serveur et on flip le booking en 'paid'.
import { json, preflight } from '../_shared/cors.ts'
import { logAudit } from '../_shared/audit.ts'
import { adminClient } from '../_shared/supabase.ts'

const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const body = await req.json().catch(() => null)
  const transactionId = body?.cpm_trans_id ?? body?.transaction_id
  if (!transactionId) return json({ error: 'missing_transaction_id' }, { status: 400 })

  const apiKey = Deno.env.get('CINETPAY_API_KEY')
  const siteId = Deno.env.get('CINETPAY_SITE_ID')
  if (!apiKey || !siteId) return json({ error: 'cinetpay_not_configured' }, { status: 500 })

  const checkRes = await fetch(CINETPAY_CHECK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
  })
  const data = await checkRes.json().catch(() => null)

  const status: string = data?.data?.status ?? data?.message ?? 'UNKNOWN'
  const accepted = status === 'ACCEPTED'

  const sb = adminClient()

  await sb
    .from('payment_intents')
    .update({
      status: accepted ? 'accepted' : 'refused',
      raw: data,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', transactionId)

  if (accepted) {
    const { data: updated } = await sb
      .from('bookings')
      .update({ status: 'paid' })
      .eq('id', transactionId)
      .in('status', ['pending', 'reserved'])
      .select('id')
      .maybeSingle()

    if (updated) {
      await logAudit(sb, req, null, {
        action: 'payment.webhook_paid',
        resource_type: 'booking',
        resource_id: transactionId,
        actor_email: 'cinetpay-webhook',
        metadata: { provider: 'cinetpay' },
      })
      // Best-effort : envoie le mail de confirmation.
      sb.functions
        .invoke('send-booking-confirmation', { body: { booking_id: transactionId } })
        .catch(() => {})
    }
  } else {
    await logAudit(sb, req, null, {
      action: 'payment.webhook_refused',
      resource_type: 'booking',
      resource_id: transactionId,
      actor_email: 'cinetpay-webhook',
      metadata: { status, raw: data?.message ?? null },
    })
  }

  return json({ ok: true, accepted })
})
