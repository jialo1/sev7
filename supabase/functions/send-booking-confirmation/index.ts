// Envoie un mail de confirmation de réservation via Resend.
// Best-effort : invoqué depuis payments-init (mock) / payments-webhook /
// confirm-onsite. En cas d'échec, log audit + console mais ne casse pas le
// flow métier.
//
// Env requises pour activer l'envoi :
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL  (ex: "SEV7 <reservations@sev7.app>")
//   PUBLIC_APP_URL     (ex: "https://app.sev7.app")
//
// Sans RESEND_API_KEY → on log et on retourne ok:true en mode mock (dev).
import { json, preflight } from '../_shared/cors.ts'
import { logAudit } from '../_shared/audit.ts'
import { adminClient } from '../_shared/supabase.ts'

const RESEND_URL = 'https://api.resend.com/emails'

type BookingDetail = {
  id: string
  status: string
  total_xof: number
  party_size: number
  starts_at: string
  payment_method: string | null
  user_id: string
  events: { title: string } | null
  tables: { label: string; zone: string } | null
  venues: { name: string; city: string } | null
}

function formatXof(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' F CFA'
}

function formatDateTimeFr(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderHtml(args: {
  title: string
  guestName: string
  venueLine: string
  dateLine: string
  tableLine: string
  partyLine: string
  totalLine: string
  ticketUrl: string
}): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>SEV7 — Confirmation de réservation</title>
</head>
<body style="margin:0;background:#0a0805;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#f5ecdc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0805;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#1a140d;border:1px solid rgba(255,240,210,0.08);border-radius:18px;overflow:hidden;">
        <tr><td style="padding:24px 28px 12px;">
          <span style="font-weight:900;letter-spacing:0.2em;color:#f4a340;font-size:13px;">SEV7</span>
        </td></tr>
        <tr><td style="padding:0 28px 24px;">
          <h1 style="margin:8px 0 12px;font-size:22px;line-height:1.25;color:#f5ecdc;">${escapeHtml(args.title)}</h1>
          <p style="margin:0 0 18px;color:#b9ad95;font-size:14px;">Bonjour ${escapeHtml(args.guestName)}, ta réservation est confirmée.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#221a10;border:1px solid rgba(255,240,210,0.08);border-radius:12px;">
            <tr><td style="padding:14px 16px;font-size:14px;">
              <p style="margin:0 0 6px;color:#b9ad95;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Lieu</p>
              <p style="margin:0;color:#f5ecdc;">${escapeHtml(args.venueLine)}</p>
            </td></tr>
            <tr><td style="padding:14px 16px;font-size:14px;border-top:1px solid rgba(255,240,210,0.08);">
              <p style="margin:0 0 6px;color:#b9ad95;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Date</p>
              <p style="margin:0;color:#f5ecdc;">${escapeHtml(args.dateLine)}</p>
            </td></tr>
            <tr><td style="padding:14px 16px;font-size:14px;border-top:1px solid rgba(255,240,210,0.08);">
              <p style="margin:0 0 6px;color:#b9ad95;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Table</p>
              <p style="margin:0;color:#f5ecdc;">${escapeHtml(args.tableLine)}</p>
            </td></tr>
            <tr><td style="padding:14px 16px;font-size:14px;border-top:1px solid rgba(255,240,210,0.08);">
              <p style="margin:0 0 6px;color:#b9ad95;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Personnes</p>
              <p style="margin:0;color:#f5ecdc;">${escapeHtml(args.partyLine)}</p>
            </td></tr>
            <tr><td style="padding:14px 16px;font-size:14px;border-top:1px solid rgba(255,240,210,0.08);">
              <p style="margin:0 0 6px;color:#b9ad95;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Total</p>
              <p style="margin:0;color:#f5ecdc;font-weight:700;">${escapeHtml(args.totalLine)}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 8px;color:#b9ad95;font-size:14px;">Présente le QR de ton billet à l'entrée :</p>
          <p style="margin:0;">
            <a href="${args.ticketUrl}" style="display:inline-block;background:linear-gradient(180deg,#f4a340 0%,#e88a2c 100%);color:#1a1207;padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px;">Voir mon billet</a>
          </p>
          <p style="margin:24px 0 0;color:#6f6552;font-size:12px;">SEV7 · Dakar, Sénégal</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const body = await req.json().catch(() => null)
  const bookingId = typeof body?.booking_id === 'string' ? body.booking_id : null
  if (!bookingId) return json({ error: 'missing_booking_id' }, { status: 400 })

  const sb = adminClient()
  const { data: booking } = (await sb
    .from('bookings')
    .select(
      'id, status, total_xof, party_size, starts_at, payment_method, user_id, events(title), tables(label, zone), venues(name, city)',
    )
    .eq('id', bookingId)
    .maybeSingle()) as { data: BookingDetail | null }

  if (!booking) return json({ error: 'booking_not_found' }, { status: 404 })
  if (!['paid', 'reserved', 'attended'].includes(booking.status)) {
    return json({ error: 'booking_not_confirmable', status: booking.status }, { status: 400 })
  }

  const { data: userRecord } = await sb.auth.admin.getUserById(booking.user_id)
  const recipient = userRecord.user?.email
  if (!recipient) return json({ error: 'recipient_unknown' }, { status: 400 })

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', booking.user_id)
    .maybeSingle()

  const guestName = profile?.full_name ?? recipient.split('@')[0] ?? 'invité(e)'
  const eventTitle = booking.events?.title ?? `Restaurant · ${booking.party_size} pers.`
  const venueLine = `${booking.venues?.name ?? '—'} · ${booking.venues?.city ?? ''}`.trim()
  const dateLine = formatDateTimeFr(booking.starts_at)
  const tableLine = `${booking.tables?.label ?? '—'} · ${booking.tables?.zone ?? ''}`.trim()
  const partyLine = `${booking.party_size} personne${booking.party_size > 1 ? 's' : ''}`
  const totalLine = formatXof(booking.total_xof)
  const publicAppUrl = Deno.env.get('PUBLIC_APP_URL') ?? 'http://localhost:5173'
  const ticketUrl = `${publicAppUrl}/tickets/${booking.id}`

  const subject =
    booking.status === 'reserved'
      ? `Réservation reçue — ${eventTitle}`
      : `Confirmation — ${eventTitle}`

  const html = renderHtml({
    title: subject,
    guestName,
    venueLine,
    dateLine,
    tableLine,
    partyLine,
    totalLine,
    ticketUrl,
  })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromAddress = Deno.env.get('RESEND_FROM_EMAIL')

  if (!apiKey || !fromAddress) {
    // Mode dev sans Resend : on log et on simule un succès.
    console.log(
      `[send-booking-confirmation] mock (no RESEND_API_KEY) → ${recipient} subject="${subject}"`,
    )
    await logAudit(sb, req, null, {
      action: 'email.confirmation_mocked',
      resource_type: 'booking',
      resource_id: booking.id,
      metadata: { recipient, subject },
    })
    return json({ ok: true, mock: true })
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: recipient,
      subject,
      html,
    }),
  })

  const result = await res.json().catch(() => null)
  const ok = res.ok

  await logAudit(sb, req, null, {
    action: ok ? 'email.confirmation_sent' : 'email.confirmation_failed',
    resource_type: 'booking',
    resource_id: booking.id,
    metadata: {
      recipient,
      subject,
      provider: 'resend',
      provider_id: result?.id ?? null,
      error: ok ? null : result ?? `http_${res.status}`,
    },
  })

  if (!ok) {
    return json(
      { error: 'email_send_failed', detail: result },
      { status: 502 },
    )
  }
  return json({ ok: true, id: result?.id ?? null })
})
