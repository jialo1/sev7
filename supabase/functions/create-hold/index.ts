import { json, preflight } from '../_shared/cors.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'

const HOLD_MINUTES = 5

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 })

  const user = await userFromAuthHeader(req)
  if (!user) return json({ error: 'unauthorized' }, { status: 401 })

  const { event_id, table_id } = await req.json()
  if (!event_id || !table_id) {
    return json({ error: 'missing_event_or_table' }, { status: 400 })
  }

  const sb = adminClient()

  const [{ data: ev }, { data: table }] = await Promise.all([
    sb.from('events').select('id, venue_id, starts_at, status').eq('id', event_id).maybeSingle(),
    sb.from('tables').select('id, venue_id, price_xof, capacity').eq('id', table_id).maybeSingle(),
  ])
  if (!ev || ev.status !== 'published') return json({ error: 'event_not_open' }, { status: 400 })
  if (!table || table.venue_id !== ev.venue_id) {
    return json({ error: 'table_mismatch' }, { status: 400 })
  }

  // Release any pending hold this user already has on this event
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
})
