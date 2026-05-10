import { json, originGuard, preflight } from '../_shared/cors.ts'
import { consumeRateLimit, RATE_LIMITS, clientIp } from '../_shared/rateLimit.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'

const HOLD_MINUTES = 5

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const blocked = originGuard(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 })

  const user = await userFromAuthHeader(req)
  if (!user) return json({ error: 'unauthorized' }, { status: 401 })

  const rl = consumeRateLimit(
    `create-hold:${user.id}:${clientIp(req)}`,
    RATE_LIMITS.createHold.max,
    RATE_LIMITS.createHold.windowMs,
  )
  if (!rl.ok) {
    return json(
      { error: 'rate_limited', retry_after_sec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const body = await req.json()
  const { event_id, table_id, starts_at, party_size } = body as {
    event_id?: string
    table_id?: string
    starts_at?: string
    party_size?: number
  }

  if (!table_id || (!event_id && !starts_at)) {
    return json({ error: 'missing_event_or_table' }, { status: 400 })
  }

  const sb = adminClient()

  if (event_id) {
    const [{ data: ev }, { data: table }] = await Promise.all([
      sb.from('events').select('id, venue_id, starts_at, status').eq('id', event_id).maybeSingle(),
      sb.from('tables').select('id, venue_id, price_xof, capacity').eq('id', table_id).maybeSingle(),
    ])
    if (!ev || ev.status !== 'published') return json({ error: 'event_not_open' }, { status: 400 })
    if (!table || table.venue_id !== ev.venue_id) {
      return json({ error: 'table_mismatch' }, { status: 400 })
    }

    await sb
      .from('bookings')
      .update({ status: 'expired' })
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .eq('status', 'pending')

    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString()

    const { data: booking, error } = await sb
      .from('bookings')
      .insert({
        user_id: user.id,
        event_id,
        venue_id: ev.venue_id,
        table_id,
        party_size: Math.min(table.capacity, 4),
        starts_at: ev.starts_at,
        status: 'pending',
        hold_expires_at: holdExpiresAt,
        total_xof: table.price_xof,
      })
      .select('id, table_id, hold_expires_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return json({ error: 'table_already_held' }, { status: 409 })
      }
      return json({ error: error.message }, { status: 500 })
    }

    return json({
      booking_id: booking.id,
      table_id: booking.table_id,
      hold_expires_at: booking.hold_expires_at,
    })
  }

  // Restaurant flow: pas d'event, on réserve une table sur une date donnée.
  const startsAtIso = new Date(starts_at!).toISOString()
  if (Number.isNaN(new Date(startsAtIso).getTime())) {
    return json({ error: 'invalid_starts_at' }, { status: 400 })
  }

  const { data: table } = await sb
    .from('tables')
    .select('id, venue_id, price_xof, capacity, venues(kind)')
    .eq('id', table_id)
    .maybeSingle()

  if (!table) return json({ error: 'table_mismatch' }, { status: 400 })
  // @ts-expect-error — relation imbriquée typée seulement à runtime
  if (table.venues?.kind !== 'restaurant') {
    return json({ error: 'table_mismatch' }, { status: 400 })
  }

  const requestedSize = Math.max(1, Math.min(party_size ?? 2, table.capacity))
  if (requestedSize > table.capacity) {
    return json({ error: 'party_too_large' }, { status: 400 })
  }

  const startsOn = startsAtIso.slice(0, 10)
  await sb
    .from('bookings')
    .update({ status: 'expired' })
    .eq('user_id', user.id)
    .eq('venue_id', table.venue_id)
    .is('event_id', null)
    .eq('starts_on', startsOn)
    .eq('status', 'pending')

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString()

  const { data: booking, error } = await sb
    .from('bookings')
    .insert({
      user_id: user.id,
      event_id: null,
      venue_id: table.venue_id,
      table_id,
      party_size: requestedSize,
      starts_at: startsAtIso,
      status: 'pending',
      hold_expires_at: holdExpiresAt,
      total_xof: table.price_xof,
    })
    .select('id, table_id, hold_expires_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return json({ error: 'table_already_held' }, { status: 409 })
    }
    return json({ error: error.message }, { status: 500 })
  }

  return json({
    booking_id: booking.id,
    table_id: booking.table_id,
    hold_expires_at: booking.hold_expires_at,
  })
})
