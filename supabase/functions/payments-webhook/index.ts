// Webhook CinetPay : on (re)vérifie la transaction côté serveur et on flip le booking en 'paid'.
//
// Sécurité :
// 1) Header `x-token` HMAC-SHA256 du payload concaténé selon la spec CinetPay
//    (https://docs.cinetpay.com/api/1.0-fr/checkout/notification). Refus 403
//    si signature invalide. Empêche un attaquant de forger /payments-webhook.
// 2) Appel à l'API CinetPay /payment/check qui revalide la transaction côté
//    serveur (défense en profondeur — même si le HMAC est compromis, on
//    consulte la vérité côté CinetPay avant de flipper le booking).
import { json, preflight } from '../_shared/cors.ts'
import { logAudit } from '../_shared/audit.ts'
import { adminClient } from '../_shared/supabase.ts'

const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check'

// Champs à concaténer pour la signature, dans l'ordre exact spécifié par CinetPay.
const SIGNATURE_FIELDS = [
  'cpm_site_id',
  'cpm_trans_id',
  'cpm_trans_date',
  'cpm_amount',
  'cpm_currency',
  'signature',
  'payment_method',
  'cel_phone_num',
  'cpm_phone_prefixe',
  'cpm_language',
  'cpm_version',
  'cpm_payment_config',
  'cpm_page_action',
  'cpm_custom',
  'cpm_designation',
  'cpm_error_message',
] as const

const encoder = new TextEncoder()

async function hmacHex(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  // On lit le body en text PUIS on parse, pour pouvoir aussi parser en
  // form-urlencoded (format que CinetPay envoie historiquement).
  const rawBody = await req.text()
  let body: Record<string, string> = {}
  const ctype = req.headers.get('content-type') ?? ''
  try {
    if (ctype.includes('application/json')) {
      body = JSON.parse(rawBody) as Record<string, string>
    } else {
      const params = new URLSearchParams(rawBody)
      params.forEach((v, k) => {
        body[k] = v
      })
    }
  } catch {
    return json({ error: 'invalid_body' }, { status: 400 })
  }

  const transactionId = body.cpm_trans_id ?? body.transaction_id
  if (!transactionId) {
    return json({ error: 'missing_transaction_id' }, { status: 400 })
  }

  const apiKey = Deno.env.get('CINETPAY_API_KEY')
  const siteId = Deno.env.get('CINETPAY_SITE_ID')
  const secretKey = Deno.env.get('CINETPAY_SECRET_KEY')
  if (!apiKey || !siteId) {
    return json({ error: 'cinetpay_not_configured' }, { status: 500 })
  }

  // Vérification HMAC du x-token. CINETPAY_SECRET_KEY est facultatif (mode
  // legacy sans signature). On le log si absent, mais on refuse si présent
  // et signature invalide.
  if (secretKey) {
    const provided = req.headers.get('x-token') ?? ''
    const expectedData = SIGNATURE_FIELDS.map((f) => body[f] ?? '').join('')
    const expectedSig = await hmacHex(secretKey, expectedData)
    if (!provided || !timingSafeEqual(provided.toLowerCase(), expectedSig.toLowerCase())) {
      const sb = adminClient()
      await logAudit(sb, req, null, {
        action: 'payment.webhook_signature_invalid',
        resource_type: 'booking',
        resource_id: transactionId,
        actor_email: 'cinetpay-webhook',
        metadata: { reason: provided ? 'mismatch' : 'missing_x_token' },
      })
      return json({ error: 'invalid_signature' }, { status: 403 })
    }
  }

  // Défense en profondeur : on (re)consulte CinetPay pour la vérité du statut.
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
        metadata: { provider: 'cinetpay', signature_verified: !!secretKey },
      })
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
