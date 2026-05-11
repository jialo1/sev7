import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateTimeFr, formatXof, ListSkeleton } from '@sev7/shared'
import { CoverImage } from '@sev7/shared'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

type EventRow = {
  id: string
  title: string
  room_label: string
  starts_at: string
  poster_url: string | null
  venues: { name: string; city: string } | null
}

export function EventsListPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, room_label, starts_at, poster_url, venues(name, city)')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
    if (error) setError(error.message)
    else setEvents((data ?? []) as unknown as EventRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchEvents)
  }, [fetchEvents])

  useRealtimeRefresh(['events'], fetchEvents)

  return (
    <main className="events-page">
      <header className="page-head">
        <h1>Soirées à venir</h1>
        <Link to="/" className="back-link">← Accueil</Link>
      </header>

      {loading && <ListSkeleton count={4} />}
      {error && <p className="error">Erreur : {error}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="empty">Aucune soirée programmée pour le moment.</p>
      )}

      <ul className="events-list">
        {events.map((e) => {
          const day = new Date(e.starts_at)
          const dayNum = day.getDate().toString().padStart(2, '0')
          const month = day
            .toLocaleString('fr-FR', { month: 'short' })
            .replace('.', '')
            .toUpperCase()
          return (
            <li key={e.id}>
              <Link to={`/events/${e.id}`} className="list-card">
                <div className="list-card-img">
                  <CoverImage src={e.poster_url} seed={e.id} />
                  <span className="date-badge">
                    {dayNum}
                    <br />
                    {month}
                  </span>
                </div>
                <div className="list-card-body">
                  <div>
                    <h3>{e.title}</h3>
                    <p className="list-card-meta">
                      {formatDateTimeFr(e.starts_at)} · {e.room_label}
                    </p>
                    {e.venues && (
                      <p className="list-card-meta">
                        {e.venues.name} — {e.venues.city}
                      </p>
                    )}
                  </div>
                  <span className="list-card-price">
                    à partir de {formatXof(40000)}
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
