import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatXof } from '@sev7/shared'

type PendingBooking = {
  id: string
  total_xof: number
  party_size: number
  events: { title: string } | null
  tables: { label: string } | null
  profiles: { full_name: string | null; phone: string | null } | null
}

type LiveOrder = {
  id: string
  status: string
  total_xof: number
  bookings: { tables: { label: string } | null } | null
}

export function DashboardPage() {
  const [pending, setPending] = useState<PendingBooking[]>([])
  const [orders, setOrders] = useState<LiveOrder[]>([])

  useEffect(() => {
    let active = true

    const refresh = async () => {
      const [{ data: bk }, { data: ords }] = await Promise.all([
        supabase
          .from('bookings')
          .select(
            'id, total_xof, party_size, events(title), tables(label), profiles(full_name, phone)',
          )
          .eq('status', 'reserved')
          .eq('payment_method', 'on_site'),
        supabase
          .from('orders')
          .select('id, status, total_xof, bookings(tables(label))')
          .in('status', ['placed', 'preparing', 'served']),
      ])
      if (!active) return
      setPending((bk ?? []) as unknown as PendingBooking[])
      setOrders((ords ?? []) as unknown as LiveOrder[])
    }
    refresh()

    const ch = supabase
      .channel('staff-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(ch)
    }
  }, [])

  async function confirm(bookingId: string) {
    await supabase.functions.invoke('confirm-onsite', {
      body: { booking_id: bookingId, action: 'admin_confirm' },
    })
  }

  async function setStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
  }

  return (
    <main className="dashboard">
      <header className="page-head">
        <h1>Dashboard staff</h1>
        <Link to="/staff/scan" className="btn-primary">Scan</Link>
      </header>

      <section>
        <h2>Réservations à confirmer (sur place)</h2>
        {pending.length === 0 ? <p>Rien à confirmer.</p> : null}
        <ul className="staff-list">
          {pending.map((b) => (
            <li key={b.id}>
              <span>{b.profiles?.full_name ?? '—'}</span>
              <span>Table {b.tables?.label}</span>
              <span>{b.party_size} pers.</span>
              <strong>{formatXof(b.total_xof)}</strong>
              <button type="button" onClick={() => confirm(b.id)}>
                Confirmer
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Commandes en cours</h2>
        <ul className="staff-list">
          {orders.map((o) => (
            <li key={o.id}>
              <span className={`badge badge--${o.status}`}>{o.status}</span>
              <span>Table {o.bookings?.tables?.label ?? '—'}</span>
              <strong>{formatXof(o.total_xof)}</strong>
              {o.status === 'placed' && (
                <button onClick={() => setStatus(o.id, 'preparing')}>Préparer</button>
              )}
              {o.status === 'preparing' && (
                <button onClick={() => setStatus(o.id, 'served')}>Servir</button>
              )}
              {o.status === 'served' && (
                <button onClick={() => setStatus(o.id, 'billed')}>Facturer</button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
