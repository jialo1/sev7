import { json, preflight } from '../_shared/cors.ts'
import { adminClient, userFromAuthHeader } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const user = await userFromAuthHeader(req)
  const body = await req.json().catch(() => ({}))
  const bookingId = body.booking_id
  if (!bookingId) return json({ error: 'missing_booking_id' }, { status: 400 })

  const sb = adminClient()

  // Only release the user's own pending hold (or via service role with no auth, used by sendBeacon fallback)
  const filter = sb
    .from('bookings')
    .update({ status: 'expired' })
    .eq('id', bookingId)
    .eq('status', 'pending')

  if (user) filter.eq('user_id', user.id)

  const { error } = await filter
  if (error) return json({ error: error.message }, { status: 500 })

  return json({ ok: true })
})
