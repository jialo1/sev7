import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTimeFr, formatXof } from '@sev7/shared'
import type { BookingStatus } from '@sev7/shared'

type Row = {
  id: string
  status: BookingStatus
  payment_method: string | null
  total_xof: number
  starts_at: string
  events: { title: string } | null
  tables: { label: string; zone: string } | null
  profiles: { full_name: string | null; phone: string | null } | null
}

const STATUSES: (BookingStatus | 'all')[] = [
  'all',
  'pending',
  'reserved',
  'paid',
  'attended',
  'cancelled',
  'expired',
]

export function AdminBookingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<BookingStatus | 'all'>('reserved')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refresh() {
    let q = supabase
      .from('bookings')
      .select(
        'id, status, payment_method, total_xof, starts_at, events(title), tables(label, zone), profiles(full_name, phone)',
      )
      .order('starts_at', { ascending: false })
      .limit(200)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    if (error) setError(error.message)
    else setRows((data ?? []) as unknown as Row[])
  }

  useEffect(() => {
    void Promise.resolve().then(refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function confirmOnsite(id: string) {
    setBusyId(id)
    const { error: e } = await supabase.functions.invoke('confirm-onsite', {
      body: { booking_id: id, action: 'admin_confirm' },
    })
    if (e) setError(e.message)
    else await refresh()
    setBusyId(null)
  }

  async function cancel(id: string) {
    if (!window.confirm('Annuler cette réservation ?')) return
    setBusyId(id)
    const { error: e } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (e) setError(e.message)
    else await refresh()
    setBusyId(null)
  }

  const total = useMemo(
    () => rows.filter((r) => r.status === 'paid' || r.status === 'attended').reduce((s, r) => s + r.total_xof, 0),
    [rows],
  )

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1 className="admin-h1">Réservations</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as BookingStatus | 'all')}
          className="admin-input admin-input--inline"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </header>

      <p className="admin-cell-dim">
        {rows.length} résultats — total payé/attendu&nbsp;: <strong>{formatXof(total)}</strong>
      </p>

      {error && <p className="error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Soirée</th>
              <th>Client</th>
              <th>Table</th>
              <th>Date</th>
              <th>Mode</th>
              <th>Total</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.events?.title ?? '—'}</td>
                <td>
                  <strong>{r.profiles?.full_name ?? '—'}</strong>
                  <br />
                  <span className="admin-cell-dim">{r.profiles?.phone ?? ''}</span>
                </td>
                <td>
                  {r.tables?.label}
                  <br />
                  <span className="admin-cell-dim">{r.tables?.zone}</span>
                </td>
                <td>{formatDateTimeFr(r.starts_at)}</td>
                <td className="admin-cell-dim">{r.payment_method ?? '—'}</td>
                <td>{formatXof(r.total_xof)}</td>
                <td>
                  <span className={`badge badge--${r.status}`}>{r.status}</span>
                </td>
                <td>
                  {r.status === 'reserved' && (
                    <button
                      type="button"
                      className="admin-link"
                      disabled={busyId === r.id}
                      onClick={() => confirmOnsite(r.id)}
                    >
                      Confirmer
                    </button>
                  )}
                  {!['cancelled', 'expired', 'attended'].includes(r.status) && (
                    <button
                      type="button"
                      className="admin-link admin-link--danger"
                      disabled={busyId === r.id}
                      onClick={() => cancel(r.id)}
                    >
                      Annuler
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Aucune réservation.</p>}
      </div>
    </div>
  )
}
