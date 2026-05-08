import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FloorPlan } from '../components/FloorPlan'
import { Sidebar } from '../components/Sidebar'
import { useTableAvailability } from '../hooks/useTableAvailability'
import { useBookingHold } from '../hooks/useBookingHold'
import { supabase } from '../lib/supabase'
import { formatDateTimeFr } from '@sev7/shared'
import { countFreeSeats } from '../venueData'
import type { NightEvent } from '@sev7/shared'

type EventRow = {
  id: string
  title: string
  room_label: string
  starts_at: string
  venue_id: string
  venues: {
    name: string
    city: string
    svg_viewbox: string | null
  } | null
}

export function SeatSelectionPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [eventRow, setEventRow] = useState<EventRow | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('events')
      .select(
        'id, title, room_label, starts_at, venue_id, venues(name, city, svg_viewbox)',
      )
      .eq('id', eventId)
      .maybeSingle()
      .then(({ data }) => setEventRow((data as unknown as EventRow) ?? null))
  }, [eventId])

  const { tables } = useTableAvailability(eventId, eventRow?.venue_id)
  const { hold, claim, release, preserve, busy, error } = useBookingHold(eventId)

  const freeSeats = useMemo(() => countFreeSeats(tables), [tables])
  const selected = useMemo(
    () => tables.find((t) => t.id === selectedId) ?? null,
    [tables, selectedId],
  )

  const eventForSidebar: NightEvent | null = eventRow
    ? {
        id: eventRow.id,
        venueName: eventRow.venues?.name ?? '',
        city: eventRow.venues?.city ?? '',
        title: eventRow.title,
        dateLabel: formatDateTimeFr(eventRow.starts_at),
        roomLabel: eventRow.room_label,
        startsAt: eventRow.starts_at,
      }
    : null

  async function handleSelect(tableId: string) {
    if (selectedId === tableId) {
      setSelectedId(null)
      await release()
      return
    }
    const result = await claim(tableId)
    if (result) setSelectedId(result.tableId)
  }

  function handleBack() {
    navigate(`/events/${eventId}`)
  }

  function handleContinue() {
    if (!selected || !hold) return
    preserve()
    navigate(`/checkout/${hold.bookingId}`)
  }

  if (!eventForSidebar) return <p className="page-loading">Chargement…</p>

  return (
    <div className="app-shell">
      <Sidebar
        event={eventForSidebar}
        selected={selected}
        onBack={handleBack}
        onContinue={handleContinue}
      />
      <FloorPlan
        tables={tables}
        selectedId={selectedId}
        freeSeats={freeSeats}
        roomLabel={eventForSidebar.roomLabel}
        onSelect={handleSelect}
        viewBox={eventRow?.venues?.svg_viewbox ?? '0 0 900 520'}
        decor="club"
      />
      {busy && <div className="toast">Réservation en cours…</div>}
      {error && <div className="toast toast--error">{error}</div>}
    </div>
  )
}
