import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateTimeFr, formatXof } from '@sev7/shared'
import { CoverImage } from '@sev7/shared'

type TicketRow = {
  id: string
  status: string
  total_xof: number
  starts_at: string
  events: { title: string; poster_url: string | null } | null
  tables: { label: string; zone: string } | null
}

export function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('bookings')
      .select(
        'id, status, total_xof, starts_at, events(title, poster_url), tables(label, zone)',
      )
      .in('status', ['reserved', 'paid', 'attended'])
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setTickets((data ?? []) as unknown as TicketRow[])
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="tickets-page">
      <header className="page-head">
        <h1>Mes billets</h1>
        <Link to="/" className="back-link">← Accueil</Link>
      </header>
      {loading && <p className="page-loading">Chargement…</p>}
      {!loading && tickets.length === 0 && (
        <p className="empty">Aucun billet pour l'instant.</p>
      )}
      <ul className="tickets-list">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link to={`/tickets/${t.id}`} className="list-card">
              <div className="list-card-img">
                <CoverImage src={t.events?.poster_url ?? null} seed={t.id} />
              </div>
              <div className="list-card-body">
                <div>
                  <h3>{t.events?.title ?? 'Réservation'}</h3>
                  <p className="list-card-meta">{formatDateTimeFr(t.starts_at)}</p>
                  <p className="list-card-meta">
                    Table {t.tables?.label} · {t.tables?.zone}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                  <span className="list-card-price">{formatXof(t.total_xof)}</span>
                  <span className={`badge badge--${t.status}`}>{t.status}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
