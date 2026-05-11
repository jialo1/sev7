import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatXof, useAuth, HomeSkeleton } from '@sev7/shared'
import { visualVariant } from '@sev7/shared'
import { CoverImage } from '@sev7/shared'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

type EventRow = {
  id: string
  title: string
  room_label: string
  starts_at: string
  poster_url: string | null
  venues: { name: string; city: string; kind: 'club' | 'restaurant' } | null
}

type Mode = 'club' | 'restaurant'

export function HomePage() {
  const { session } = useAuth()
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('club')
  const [search, setSearch] = useState('')

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select(
        'id, title, room_label, starts_at, poster_url, venues(name, city, kind)',
      )
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
    setEvents((data ?? []) as unknown as EventRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchEvents)
  }, [fetchEvents])

  useRealtimeRefresh(['events'], fetchEvents)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events
      .filter((e) => e.venues?.kind === mode)
      .filter((e) => !q || e.title.toLowerCase().includes(q))
  }, [events, search, mode])

  const featured = filtered[0]
  const rest = filtered.slice(1)

  return (
    <main className="home-page">
      <header className="home-top">
        {session ? (
          <Link
            to="/account"
            className="home-avatar"
            aria-label="Mon compte"
            title="Mon compte"
          >
            {session.user?.email?.[0]?.toUpperCase() ?? '?'}
          </Link>
        ) : (
          <Link
            to="/auth/login"
            className="home-avatar home-avatar--guest"
            aria-label="Se connecter"
            title="Se connecter"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0116 0" strokeLinecap="round" />
            </svg>
          </Link>
        )}
        <div className="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Cherche une soirée, un artiste, un lieu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="filter-btn" aria-label="Filtres">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="segmented segmented--center" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'club'}
          className={mode === 'club' ? 'active' : ''}
          onClick={() => setMode('club')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          Club
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'restaurant'}
          className={mode === 'restaurant' ? 'active' : ''}
          onClick={() => setMode('restaurant')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 3v8a2 2 0 002 2v8M9 3v8a2 2 0 01-2 2M19 3a4 4 0 00-4 4v6h4M19 13v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Restaurant
        </button>
      </div>

      {mode === 'restaurant' && (
        <Link to="/restaurant" className="featured-card" style={{ aspectRatio: '16/9' }}>
          <CoverImage
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80"
            seed="restaurant-hero"
          />
          <div className="featured-body">
            <span className="featured-tag">Restaurant</span>
            <h3>Réserve ta table</h3>
            <p>Choisis une date et un nombre de personnes.</p>
          </div>
        </Link>
      )}

      {mode === 'club' && featured && (
        <>
          <div className="section-head">
            <h2>À l'affiche</h2>
            <Link to="/events">Voir tout</Link>
          </div>
          <div className="featured-row">
            {filtered.slice(0, 3).map((e) => (
              <Link to={`/events/${e.id}`} key={e.id} className="featured-card">
                <FeaturedCover posterUrl={e.poster_url} eventId={e.id} />
                <div className="featured-body">
                  <span className="featured-tag">Soirée</span>
                  <h3>{e.title}</h3>
                  <p>{e.venues?.name} · {e.venues?.city}</p>
                  <span className="pill-cta">
                    Découvrir
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {mode === 'club' && rest.length > 0 && (
        <>
          <div className="section-head">
            <h2>Toutes les soirées</h2>
            <Link to="/events">Voir tout</Link>
          </div>
          <ul className="events-list">
            {rest.map((e) => (
              <li key={e.id}>
                <EventListCard event={e} />
              </li>
            ))}
          </ul>
        </>
      )}

      {loading && events.length === 0 ? (
        <HomeSkeleton />
      ) : (
        filtered.length === 0 && (
          <p className="empty">Pas de soirée pour le moment dans cette catégorie.</p>
        )
      )}
    </main>
  )
}

function FeaturedCover({
  posterUrl,
  eventId,
}: {
  posterUrl: string | null
  eventId: string
}) {
  const [broken, setBroken] = useState(false)
  const v = visualVariant(eventId, 3)

  if (!posterUrl || broken) {
    return (
      <div
        className={`featured-card-placeholder ph-${v}`}
        aria-hidden
      />
    )
  }

  return (
    <img
      src={posterUrl}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

function EventListCard({ event }: { event: EventRow }) {
  const [imgBroken, setImgBroken] = useState(false)
  const day = new Date(event.starts_at)
  const dayNum = day.getDate().toString().padStart(2, '0')
  const month = day
    .toLocaleString('fr-FR', { month: 'short' })
    .replace('.', '')
    .toUpperCase()
  const price = 80000 // Phase 4: lookup min table price for the event
  const ph = visualVariant(event.id, 3)

  return (
    <Link to={`/events/${event.id}`} className="list-card">
      <div className="list-card-img">
        {event.poster_url && !imgBroken ? (
          <img
            src={event.poster_url}
            alt=""
            loading="lazy"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div
            className={`list-card-placeholder ph-${ph}`}
            aria-hidden
          />
        )}
        <span className="date-badge">
          {dayNum}
          <br />
          {month}
        </span>
      </div>
      <div className="list-card-body">
        <div>
          <h3>{event.title}</h3>
          <p className="list-card-meta">
            {event.venues?.name} · {event.room_label}
          </p>
        </div>
        <span className="list-card-price">à partir de {formatXof(price)}</span>
      </div>
      <button type="button" className="list-card-fav" aria-label="Favoris">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14l-7 7-7-7a5 5 0 117-7 5 5 0 117 7z" />
        </svg>
      </button>
    </Link>
  )
}
