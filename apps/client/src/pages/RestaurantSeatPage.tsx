import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FloorPlan } from '../components/FloorPlan'
import { supabase } from '../lib/supabase'
import type { ClubTable } from '@sev7/shared'

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

export function RestaurantSeatPage() {
  const [params] = useSearchParams()
  const date = params.get('date')
  const partySize = Number(params.get('party') ?? 2)
  const [tables, setTables] = useState<ClubTable[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState('0 0 900 520')

  useEffect(() => {
    let active = true
    supabase
      .from('venues')
      .select('id, svg_viewbox')
      .eq('kind', 'restaurant')
      .maybeSingle()
      .then(async ({ data: venue }) => {
        if (!venue || !active) return
        if (venue.svg_viewbox) setViewBox(venue.svg_viewbox)
        const { data } = await supabase
          .from('tables')
          .select('id, label, capacity, zone, price_xof, x, y, w, h, rx, variant')
          .eq('venue_id', venue.id)
        if (!active) return
        const rows = (data ?? []) as DbTable[]
        setTables(
          rows.map((t) => ({
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
            status: 'available',
            variant: t.variant ?? 'standard',
          })),
        )
      })
    return () => {
      active = false
    }
  }, [])

  const free = useMemo(
    () =>
      tables.filter((t) => t.status === 'available' && t.capacity >= partySize)
        .length,
    [tables, partySize],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-inner">
          <Link to="/restaurant" className="back-link">← Modifier</Link>
          <h1>Restaurant — {date ?? ''}</h1>
          <p>{partySize} personnes</p>
          <p>{free} tables compatibles</p>
          {selectedId && (
            <button type="button" className="btn-primary">
              Confirmer la réservation
            </button>
          )}
        </div>
      </aside>
      <FloorPlan
        tables={tables}
        selectedId={selectedId}
        freeSeats={free}
        roomLabel="Salle restaurant"
        onSelect={(id) => setSelectedId((c) => (c === id ? null : id))}
        viewBox={viewBox}
        decor="restaurant"
      />
    </div>
  )
}
