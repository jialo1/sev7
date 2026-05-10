import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FloorPlan } from '../components/FloorPlan'
import { Sidebar } from '../components/Sidebar'
import { supabase } from '../lib/supabase'
import { useRestaurantTableAvailability } from '../hooks/useRestaurantTableAvailability'
import { useRestaurantBookingHold } from '../hooks/useRestaurantBookingHold'
import { countFreeSeats } from '../venueData'
import { formatDateTimeFr } from '@sev7/shared'
import type { NightEvent } from '@sev7/shared'

type VenueRow = {
  id: string
  name: string
  city: string
  svg_viewbox: string | null
}

export function RestaurantSeatPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const dateParam = params.get('date')
  const partySize = Math.max(1, Number(params.get('party') ?? 2))
  const startsAtIso = dateParam ? new Date(dateParam).toISOString() : null
  const startsOn = startsAtIso ? startsAtIso.slice(0, 10) : null

  const [venue, setVenue] = useState<VenueRow | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('venues')
      .select('id, name, city, svg_viewbox')
      .eq('kind', 'restaurant')
      .maybeSingle()
      .then(({ data }) => {
        if (active) setVenue((data as VenueRow) ?? null)
      })
    return () => {
      active = false
    }
  }, [])

  const { tables } = useRestaurantTableAvailability(venue?.id, startsOn)
  const { hold, claim, release, preserve, busy, error } = useRestaurantBookingHold(
    startsAtIso,
    partySize,
  )

  const compatibleSeats = useMemo(
    () => tables.filter((t) => t.status === 'available' && t.capacity >= partySize).length,
    [tables, partySize],
  )
  const freeSeats = useMemo(() => countFreeSeats(tables), [tables])
  const selected = useMemo(
    () => tables.find((t) => t.id === selectedId) ?? null,
    [tables, selectedId],
  )

  const eventForSidebar: NightEvent | null = venue && dateParam
    ? {
        id: venue.id,
        venueName: venue.name,
        city: venue.city,
        title: `Restaurant · ${partySize} pers.`,
        dateLabel: formatDateTimeFr(startsAtIso ?? dateParam),
        roomLabel: 'Salle restaurant',
        startsAt: startsAtIso ?? dateParam,
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

  async function handleBack() {
    if (hold) await release()
    setSelectedId(null)
    if (window.history.length > 1) navigate(-1)
    else navigate('/restaurant', { replace: true })
  }

  async function handleCancel() {
    if (hold) await release()
    setSelectedId(null)
  }

  function handleContinue() {
    if (!selected || !hold) return
    preserve()
    navigate(`/checkout/${hold.bookingId}`)
  }

  if (!dateParam) {
    return (
      <main className="resto-home">
        <p className="empty">Choisis une date pour voir le plan de salle.</p>
      </main>
    )
  }

  if (!eventForSidebar) return <p className="page-loading">Chargement…</p>

  return (
    <div className="app-shell">
      <Sidebar
        event={eventForSidebar}
        selected={selected}
        onBack={handleBack}
        onContinue={handleContinue}
        onCancel={handleCancel}
      />
      <FloorPlan
        tables={tables}
        selectedId={selectedId}
        freeSeats={compatibleSeats > 0 ? compatibleSeats : freeSeats}
        roomLabel={`Restaurant · ${compatibleSeats} tables compatibles`}
        onSelect={handleSelect}
        viewBox={venue?.svg_viewbox ?? '0 0 900 520'}
        decor="restaurant"
      />
      {busy && <div className="toast">Réservation en cours…</div>}
      {error && <div className="toast toast--error">{error}</div>}
    </div>
  )
}
