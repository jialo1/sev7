import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatXof } from '@sev7/shared'

type Stats = {
  totalRevenue: number
  paidBookings: number
  attendedBookings: number
  cancelledBookings: number
  totalEvents: number
  totalUsers: number
}

export function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    Promise.all([
      supabase
        .from('bookings')
        .select('total_xof,status')
        .in('status', ['paid', 'attended']),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'attended'),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled'),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]).then(([revData, paid, attended, cancelled, events, users]) => {
      if (!active) return
      const totalRevenue = (revData.data ?? []).reduce(
        (s, b) => s + (b.total_xof ?? 0),
        0,
      )
      setStats({
        totalRevenue,
        paidBookings: paid.count ?? 0,
        attendedBookings: attended.count ?? 0,
        cancelledBookings: cancelled.count ?? 0,
        totalEvents: events.count ?? 0,
        totalUsers: users.count ?? 0,
      })
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Statistiques</h1>
      {loading ? (
        <p className="page-loading">Chargement…</p>
      ) : !stats ? (
        <p className="empty">Pas de données</p>
      ) : (
        <>
          <div className="admin-stats">
            <Tile label="Chiffre d'affaires" value={formatXof(stats.totalRevenue)} accent />
            <Tile label="Billets payés" value={stats.paidBookings} />
            <Tile label="Présences (attended)" value={stats.attendedBookings} />
            <Tile label="Annulations" value={stats.cancelledBookings} />
            <Tile label="Soirées totales" value={stats.totalEvents} />
            <Tile label="Utilisateurs" value={stats.totalUsers} />
          </div>
          <p
            style={{
              marginTop: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-mute)',
            }}
          >
            Graphiques avancés (vente par jour, taux de remplissage, top tables) en
            Phase B avec Recharts. <Link to="/admin" className="admin-link">Retour</Link>
          </p>
        </>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent?: boolean
}) {
  return (
    <div className={`admin-stat${accent ? ' admin-stat--accent' : ''}`}>
      <span className="admin-stat-value">{value}</span>
      <span className="admin-stat-label">{label}</span>
    </div>
  )
}
