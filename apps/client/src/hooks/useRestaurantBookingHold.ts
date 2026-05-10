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
    case 'table_mismatch':
      return 'Erreur : cette table n\'appartient pas à ce restaurant.'
    case 'party_too_large':
      return 'Cette table est trop petite pour ton groupe.'
    case 'unauthorized':
      return 'Tu dois être connecté pour réserver une table.'
    case 'invalid_starts_at':
      return 'Date invalide.'
    case 'missing_event_or_table':
      return 'Données de réservation incomplètes.'
    default:
      return code || 'Erreur lors de la réservation. Réessaie.'
  }
}

export function useRestaurantBookingHold(
  startsAtIso: string | null,
  partySize: number,
) {
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
      if (!startsAtIso) return null
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
          body: { table_id: tableId, starts_at: startsAtIso, party_size: partySize },
        })

        if (res.error) {
          let reason = res.error.message
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
    [startsAtIso, partySize],
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
