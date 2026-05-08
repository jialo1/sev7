// Émet un JWT signé pour un booking 'paid', stocke son SHA-256 dans qr_token_hash.
import { json, preflight } from '../_shared/cors.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'
import { SignJWT } from 'https://esm.sh/jose@5'

const encoder = new TextEncoder()

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const user = await userFromAuthHeader(req)
  if (!user) return json({ error: 'unauthorized' }, { status: 401 })

  const { booking_id } = await req.json()
  if (!booking_id) return json({ error: 'missing_booking_id' }, { status: 400 })

  const secret = Deno.env.get('QR_SIGNING_SECRET')
  if (!secret) return json({ error: 'qr_secret_not_configured' }, { status: 500 })

  const sb = adminClient()
  const { data: booking } = await sb
    .from('bookings')
    .select('id, user_id, event_id, table_id, status, starts_at, qr_token_hash')
    .eq('id', booking_id)
    .maybeSingle()
  if (!booking || booking.user_id !== user.id) {
    return json({ error: 'booking_not_found' }, { status: 404 })
  }
  if (!['paid', 'attended'].includes(booking.status)) {
    return json({ error: 'booking_not_paid' }, { status: 400 })
  }

  const exp =
    Math.floor(new Date(booking.starts_at).getTime() / 1000) + 6 * 3600
  const jti = crypto.randomUUID()

  const token = await new SignJWT({
    booking_id: booking.id,
    event_id: booking.event_id,
    table_id: booking.table_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(encoder.encode(secret))

  const hash = await sha256Hex(token)
  await sb.from('bookings').update({ qr_token_hash: hash }).eq('id', booking.id)

  return json({ token })
})
