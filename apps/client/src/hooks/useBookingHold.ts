import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Hold = {
  bookingId: string
  tableId: string
  expiresAt: string
}

export function useBookingHold(eventId: string | undefined) {
  const [hold, setHold] = useState<Hold | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const holdRef = useRef<Hold | null>(null)
  const preservedRef = useRef(false)

  useEffect(() => {
    holdRef.current = hold
  }, [hold])

  const claim = useCallback(
    async (tableId: string) => {
      if (!eventId) return null
      setBusy(true)
      setError(null)
      try {
        if (holdRef.current && holdRef.current.tableId !== tableId) {
          await supabase.functions.invoke('release-hold', {
            body: { booking_id: holdRef.current.bookingId },
          })
        }
        const { data, error: fnErr } = await supabase.functions.invoke<{
          booking_id: string
          table_id: string
          hold_expires_at: string
        }>('create-hold', {
          body: { event_id: eventId, table_id: tableId },
        })
        if (fnErr) {
          setError(fnErr.message)
          return null
        }
        if (!data) return null
        const next = {
          bookingId: data.booking_id,
          tableId: data.table_id,
          expiresAt: data.hold_expires_at,
        }
        setHold(next)
        preservedRef.current = false
        return next
      } finally {
        setBusy(false)
      }
    },
    [eventId],
  )

  const release = useCallback(async () => {
    if (!holdRef.current) return
    const id = holdRef.current.bookingId
    setHold(null)
    await supabase.functions.invoke('release-hold', { body: { booking_id: id } })
  }, [])

  const preserve = useCallback(() => {
    preservedRef.current = true
  }, [])

  useEffect(() => {
    return () => {
      if (preservedRef.current) return
      if (holdRef.current) {
        const id = holdRef.current.bookingId
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/release-hold`,
          new Blob([JSON.stringify({ booking_id: id })], { type: 'application/json' }),
        )
      }
    }
  }, [])

  return { hold, claim, release, preserve, busy, error }
}
