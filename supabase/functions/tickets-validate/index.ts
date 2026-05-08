// Vérifie un JWT scanné, marque le booking en 'attended' (single-use), retourne nom + table.
import { json, preflight } from '../_shared/cors.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'
import { jwtVerify } from 'https://esm.sh/jose@5'

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

  const sb = adminClient()
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['scanner', 'staff', 'admin'].includes(profile.role)) {
    return json({ ok: false, reason: 'Accès scan uniquement' }, { status: 403 })
  }

  const { token } = await req.json()
  if (!token) return json({ ok: false, reason: 'Token manquant' }, { status: 400 })

  const secret = Deno.env.get('QR_SIGNING_SECRET')
  if (!secret) return json({ ok: false, reason: 'Config QR manquante' }, { status: 500 })

  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret))
    const bookingId = payload.booking_id as string
    const hash = await sha256Hex(token)

    const { data: booking } = await sb
      .from('bookings')
      .select('id, status, qr_token_hash, user_id, tables(label)')
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking) return json({ ok: false, reason: 'Billet inconnu' })
    if (booking.qr_token_hash !== hash) {
      return json({ ok: false, reason: 'Signature invalide' })
    }
    if (booking.status === 'attended') {
      return json({ ok: false, reason: 'Déjà utilisé' })
    }
    if (booking.status !== 'paid') {
      return json({ ok: false, reason: `Billet en statut ${booking.status}` })
    }

    const { data: updated } = await sb
      .from('bookings')
      .update({
        status: 'attended',
        scanned_by: user.id,
        scanned_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
      .eq('status', 'paid')
      .select('id')
      .maybeSingle()

    if (!updated) return json({ ok: false, reason: 'Déjà utilisé' })

    const { data: guestProfile } = await sb
      .from('profiles')
      .select('full_name')
      .eq('id', booking.user_id)
      .maybeSingle()

    // @ts-expect-error — relation imbriquée typée seulement à runtime
    const tableLabel = booking.tables?.label ?? '—'
    return json({
      ok: true,
      guest: guestProfile?.full_name ?? 'Invité',
      table_label: tableLabel,
    })
  } catch {
    return json({ ok: false, reason: 'Token invalide ou expiré' })
  }
})
