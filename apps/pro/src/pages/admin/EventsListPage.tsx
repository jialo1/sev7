import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTimeFr, useAuth } from '@sev7/shared'

type EventRow = {
  id: string
  title: string
  room_label: string
  starts_at: string
  status: 'draft' | 'published' | 'archived'
  poster_url: string | null
  venues: { name: string } | null
}

const STATUSES = ['draft', 'published', 'archived'] as const

export function AdminEventsListPage() {
  const { user, role } = useAuth()
  const [events, setEvents] = useState<EventRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    let q = supabase
      .from('events')
      .select('id, title, room_label, starts_at, status, poster_url, venues(name)')
      .order('starts_at', { ascending: true })
    // Organizer ne voit QUE ses events (sinon RLS public_select fait
    // remonter les events publiés des autres).
    if (role === 'organizer') q = q.eq('organizer_id', user.id)
    const { data, error } = await q
    if (error) setError(error.message)
    else setEvents((data ?? []) as unknown as EventRow[])
  }, [user, role])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function setStatus(id: string, status: EventRow['status']) {
    setBusyId(id)
    const { error: e } = await supabase.from('events').update({ status }).eq('id', id)
    if (e) setError(e.message)
    else await refresh()
    setBusyId(null)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1 className="admin-h1">Soirées</h1>
        <Link to="/admin/events/new" className="btn-primary btn-primary--inline">
          + Nouvelle soirée
        </Link>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Date</th>
              <th>Salle</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{e.title}</strong>
                  <br />
                  <span className="admin-cell-dim">{e.venues?.name}</span>
                </td>
                <td>{formatDateTimeFr(e.starts_at)}</td>
                <td>{e.room_label}</td>
                <td>
                  <select
                    value={e.status}
                    disabled={busyId === e.id}
                    onChange={(ev) => setStatus(e.id, ev.target.value as EventRow['status'])}
                    className="admin-input admin-input--inline"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Link to={`/admin/events/${e.id}`} className="admin-link">
                    Éditer
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="empty">Aucune soirée. Crée la première.</p>}
      </div>
    </div>
  )
}
