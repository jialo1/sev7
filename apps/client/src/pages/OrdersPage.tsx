import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatXof, useAuth } from '@sev7/shared'

type OrderRow = {
  id: string
  status: string
  total_xof: number
  created_at: string
  bookings: { id: string; tables: { label: string } | null } | null
}

export function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total_xof, created_at, bookings(id, tables(label))')
      .order('created_at', { ascending: false })
    setOrders((data ?? []) as unknown as OrderRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`orders:user=${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void fetchOrders()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchOrders])

  return (
    <main className="orders-page">
      <header className="page-head">
        <h1>Mes commandes</h1>
        <Link to="/" className="back-link">← Accueil</Link>
      </header>
      {loading && <p>Chargement…</p>}
      {!loading && orders.length === 0 && <p className="empty">Aucune commande.</p>}
      <ul className="orders-list">
        {orders.map((o) => (
          <li key={o.id}>
            <span className={`badge badge--${o.status}`}>{o.status}</span>
            <span>Table {o.bookings?.tables?.label ?? '—'}</span>
            <strong>{formatXof(o.total_xof)}</strong>
          </li>
        ))}
      </ul>
    </main>
  )
}
