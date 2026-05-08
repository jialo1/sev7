// Webhook CinetPay : on (re)vérifie la transaction côté serveur et on flip le booking en 'paid'.
import { json, preflight } from '../_shared/cors.ts'
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
    await sb
      .from('bookings')
      .update({ status: 'paid' })
      .eq('id', transactionId)
      .in('status', ['pending', 'reserved'])
  }

  return json({ ok: true, accepted })
})
