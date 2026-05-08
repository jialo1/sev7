import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateTimeFr, formatXof } from '@sev7/shared'
import { CoverImage } from '@sev7/shared'

type EventRow = {
  id: string
  title: string
  room_label: string
  starts_at: string
  poster_url: string | null
  venues: { name: string; city: string } | null
}

type TableRow = { price_xof: number; capacity: number }

const TABS = ['À propos', 'Galerie', 'Organisateur', 'Avis', 'Plus']

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [tables, setTables] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (!id) return
    let active = true

    supabase
      .from('events')
      .select(
        'id, title, room_label, starts_at, poster_url, venues(name, city), venue_id',
      )
      .eq('id', id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!active) return
        const ev = data as unknown as (EventRow & { venue_id: string }) | null
        setEvent(ev)
        if (ev) {
          const { data: ts } = await supabase
            .from('tables')
            .select('price_xof, capacity')
            .eq('venue_id', ev.venue_id)
          if (active) setTables((ts ?? []) as TableRow[])
        }
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const minPrice = useMemo(
    () => (tables.length ? Math.min(...tables.map((t) => t.price_xof)) : 0),
    [tables],
  )

  if (loading) return <p className="page-loading">Chargement…</p>
  if (!event) return <p className="empty">Soirée introuvable.</p>

  return (
    <article className="event-detail">
      <div className="detail-hero">
        <CoverImage src={event.poster_url} seed={event.id} />
        <div className="detail-hero-top">
          <button
            type="button"
            className="icon-btn"
            aria-label="Retour"
            onClick={() => navigate(-1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="icon-btn" aria-label="Sauvegarder">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="icon-btn" aria-label="Partager">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="detail-hero-bottom">
          <div className="detail-tags">
            <span className="detail-tag">CLUB</span>
            <span className="detail-tag muted">SOIRÉE</span>
          </div>
          <h1>{event.title}</h1>
          <p>
            Une soirée d'exception au {event.venues?.name}.{' '}
            {event.venues?.city} — {event.room_label}.
          </p>
        </div>
      </div>

      <div className="detail-body">
        <button type="button" className="accordion-row">
          <span className="accordion-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0116 0" />
            </svg>
          </span>
          <div>
            <strong>Invité Surprise</strong>
            <span>Tête d'affiche</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button type="button" className="accordion-row">
          <span className="accordion-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
          </span>
          <div>
            <strong>{formatDateTimeFr(event.starts_at)}</strong>
            <span>Voir le programme</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="tabs">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              className={i === activeTab ? 'active' : ''}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', lineHeight: 1.55 }}>
            Réserve ta table sur le plan, paie en ligne et profite de ta soirée. Le QR sera scanné à
            l'entrée. Tu pourras commander tes consos depuis l'app pendant la soirée.
          </p>
        )}
        {activeTab !== 0 && (
          <p className="empty" style={{ padding: '1rem 0' }}>
            Cette section arrive bientôt.
          </p>
        )}
      </div>

      <div className="detail-cta-bar">
        <span className="detail-price">
          dès {formatXof(minPrice)}
        </span>
        <Link to={`/events/${event.id}/seats`} className="btn-primary" style={{ width: 'auto', flex: 1 }}>
          Choisir ma table
        </Link>
      </div>
    </article>
  )
}
