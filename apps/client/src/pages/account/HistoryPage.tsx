import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTimeFr, formatXof } from '@sev7/shared'
import { CoverImage } from '@sev7/shared'

type Row = {
  id: string
  status: string
  total_xof: number
  starts_at: string
  events: { title: string; poster_url: string | null } | null
  tables: { label: string; zone: string } | null
}

export function AccountHistoryPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('bookings')
      .select(
        'id, status, total_xof, starts_at, events(title, poster_url), tables(label, zone)',
      )
      .in('status', ['attended', 'cancelled', 'expired'])
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setRows((data ?? []) as unknown as Row[])
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="account-page">
      <header className="page-head">
        <h1>Historique</h1>
        <Link to="/account" className="back-link">← Mon compte</Link>
      </header>
      {loading && <p className="page-loading">Chargement…</p>}
      {!loading && rows.length === 0 && (
        <p className="empty">Aucune soirée passée pour le moment.</p>
      )}
      <ul className="tickets-list">
        {rows.map((r) => (
          <li key={r.id}>
            <div className="list-card">
              <div className="list-card-img">
                <CoverImage src={r.events?.poster_url ?? null} seed={r.id} />
              </div>
              <div className="list-card-body">
                <div>
                  <h3>{r.events?.title ?? 'Réservation'}</h3>
                  <p className="list-card-meta">{formatDateTimeFr(r.starts_at)}</p>
                  <p className="list-card-meta">
                    Table {r.tables?.label} · {r.tables?.zone}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                  <span className="list-card-price">{formatXof(r.total_xof)}</span>
                  <span className={`badge badge--${r.status}`}>{r.status}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
