import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QrTicket } from '@sev7/shared'
import { formatDateTimeFr, formatXof } from '@sev7/shared'

type Detail = {
  id: string
  status: string
  total_xof: number
  starts_at: string
  events: { title: string } | null
  tables: { label: string; zone: string } | null
}

const TOKEN_KEY = (id: string) => `sev7.ticket.token.${id}`

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true

    supabase
      .from('bookings')
      .select('id, status, total_xof, starts_at, events(title), tables(label, zone)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setDetail((data as unknown as Detail) ?? null)
      })

    Promise.resolve(localStorage.getItem(TOKEN_KEY(id))).then((cached) => {
      if (active && cached) setToken(cached)
    })

    supabase.functions
      .invoke<{ token: string }>('tickets-issue', { body: { booking_id: id } })
      .then(({ data }) => {
        if (active && data?.token) {
          setToken(data.token)
          localStorage.setItem(TOKEN_KEY(id), data.token)
        }
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  if (loading && !detail) return <p>Chargement…</p>
  if (!detail) return <p>Billet introuvable.</p>

  return (
    <main className="ticket-detail">
      <Link to="/tickets" className="back-link">← Mes billets</Link>
      <h1>{detail.events?.title ?? 'Réservation'}</h1>
      <p>{formatDateTimeFr(detail.starts_at)}</p>
      <p>
        Table {detail.tables?.label} · {detail.tables?.zone} ·{' '}
        {formatXof(detail.total_xof)}
      </p>
      <div className="qr-frame">
        {token ? (
          <QrTicket token={token} />
        ) : (
          <p>QR pas encore disponible (en attente de confirmation).</p>
        )}
      </div>
      <p className="hint">Présente ce QR à l'entrée pour le scan.</p>
    </main>
  )
}
