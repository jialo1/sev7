import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Hold = {
  bookingId: string
  tableId: string
  expiresAt: string
}

function humanError(code: string): string {
  switch (code) {
    case 'table_already_held':
      return 'Cette table vient d\'être prise par quelqu\'un d\'autre. Choisis-en une autre.'
    case 'event_not_open':
      return 'Cette soirée n\'est pas (ou plus) ouverte à la réservation.'
    case 'table_mismatch':
      return 'Erreur : cette table n\'appartient pas à cette soirée.'
    case 'unauthorized':
      return 'Tu dois être connecté pour réserver une table.'
    case 'missing_event_or_table':
      return 'Données de réservation incomplètes.'
    default:
      return code || 'Erreur lors de la réservation. Réessaie.'
  }
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
        const res = await supabase.functions.invoke<{
          booking_id: string
          table_id: string
          hold_expires_at: string
          error?: string
        }>('create-hold', {
          body: { event_id: eventId, table_id: tableId },
        })

        // Cas erreur HTTP (409, 400, 500…) : le client SDK met `error` mais
        // perd le body. On essaie de récupérer le payload via context.response
        if (res.error) {
          let reason = res.error.message
          // FunctionsHttpError expose response sur certaines versions
          const response = (res.error as { context?: { response?: Response } })
            .context?.response
          if (response) {
            try {
              const payload = await response.json()
              reason = payload?.error ?? reason
            } catch {
              /* ignore */
            }
          }
          setError(humanError(reason))
          return null
        }

        const data = res.data
        if (!data || data.error) {
          setError(humanError(data?.error ?? 'unknown_error'))
          return null
        }

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
