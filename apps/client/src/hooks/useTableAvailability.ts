import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ClubTable, TableStatus } from '@sev7/shared'

type DbTable = {
  id: string
  label: string
  capacity: number
  zone: string
  price_xof: number
  x: number
  y: number
  w: number
  h: number
  rx: number
  variant: 'standard' | 'vip' | null
}

type DbBooking = {
  id: string
  table_id: string
  status: 'pending' | 'reserved' | 'paid' | 'cancelled' | 'attended' | 'expired'
  user_id: string
  hold_expires_at: string | null
}

const ACTIVE_STATUSES = new Set(['pending', 'reserved', 'paid', 'attended'])

type ExtendedStatus = TableStatus | 'mine-pending' | 'mine-locked'

function tableStatusFromBookings(
  bookings: DbBooking[],
  currentUserId: string | null,
): ExtendedStatus {
  const active = bookings.find((b) => ACTIVE_STATUSES.has(b.status))
  if (!active) return 'available'
  if (currentUserId && active.user_id === currentUserId) {
    // Mon hold pending → je peux re-cliquer pour deselect.
    // Mon billet payé/réservé → verrouillé, je ne peux pas en prendre une 2e
    return active.status === 'pending' ? 'mine-pending' : 'mine-locked'
  }
  if (active.status === 'pending') return 'pending'
  return 'booked'
}

export function useTableAvailability(eventId: string | undefined, venueId: string | undefined) {
  const [dbTables, setDbTables] = useState<DbTable[]>([])
  const [bookings, setBookings] = useState<DbBooking[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!venueId) return
    let active = true
    supabase
      .from('tables')
      .select('id, label, capacity, zone, price_xof, x, y, w, h, rx, variant')
      .eq('venue_id', venueId)
      .then(({ data }) => {
        if (active) setDbTables((data ?? []) as DbTable[])
      })
    return () => {
      active = false
    }
  }, [venueId])

  useEffect(() => {
    if (!eventId) return
    let active = true

    supabase
      .from('bookings')
      .select('id, table_id, status, user_id, hold_expires_at')
      .eq('event_id', eventId)
      .in('status', ['pending', 'reserved', 'paid', 'attended'])
      .then(({ data }) => {
        if (active) {
          setBookings((data ?? []) as DbBooking[])
          setLoading(false)
        }
      })

    const channel = supabase
      .channel(`bookings:event=${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `event_id=eq.${eventId}` },
        (payload) => {
          setBookings((prev) => {
            const next = [...prev]
            const row = (payload.new ?? payload.old) as DbBooking
            const idx = next.findIndex((b) => b.id === row.id)
            if (payload.eventType === 'DELETE') {
              if (idx >= 0) next.splice(idx, 1)
              return next
            }
            const newRow = payload.new as DbBooking
            if (idx >= 0) next[idx] = newRow
            else next.push(newRow)
            return next
          })
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const tables: ClubTable[] = useMemo(() => {
    return dbTables.map((t) => {
      const tableBookings = bookings.filter((b) => b.table_id === t.id)
      const computed = tableStatusFromBookings(tableBookings, userId)
      const status: TableStatus =
        computed === 'mine-pending'
          ? 'available' // mon hold actuel : cliquable pour deselect
          : computed === 'mine-locked'
            ? 'booked' // mon billet déjà acheté : verrouillé
            : (computed as TableStatus)
      return {
        id: t.id,
        label: t.label,
        capacity: t.capacity,
        zone: t.zone,
        priceXof: t.price_xof,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        rx: t.rx,
        status,
        variant: t.variant ?? 'standard',
      }
    })
  }, [dbTables, bookings, userId])

  return { tables, loading, currentUserId: userId }
}
