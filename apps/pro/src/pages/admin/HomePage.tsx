import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Stats = {
  events: number
  bookings: number
  pending: number
  scanners: number
}

export function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'reserved'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'scanner'),
    ]).then(([e, b, p, s]) => {
      if (!active) return
      setStats({
        events: e.count ?? 0,
        bookings: b.count ?? 0,
        pending: p.count ?? 0,
        scanners: s.count ?? 0,
      })
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="admin-page">
      <h1 className="admin-h1">Vue d'ensemble</h1>

      <div className="admin-stats">
        <Tile label="Soirées publiées" value={stats?.events ?? '…'} />
        <Tile label="Réservations totales" value={stats?.bookings ?? '…'} />
        <Tile label="À confirmer (sur place)" value={stats?.pending ?? '…'} accent />
        <Tile label="Scanners actifs" value={stats?.scanners ?? '…'} />
      </div>

      <h2 className="admin-h2">Accès rapide</h2>
      <div className="admin-tiles">
        <Link to="/admin/events/new" className="admin-tile">
          <strong>Nouvelle soirée</strong>
          <p>Créer un événement avec poster, date, prix de base.</p>
        </Link>
        <Link to="/admin/bookings" className="admin-tile">
          <strong>Réservations à confirmer</strong>
          <p>Valider les paiements sur place.</p>
        </Link>
        <Link to="/admin/users" className="admin-tile">
          <strong>Comptes scanner</strong>
          <p>Créer ou révoquer les portiers.</p>
        </Link>
        <Link to="/admin/menu" className="admin-tile">
          <strong>Menu boissons</strong>
          <p>Ajouter ou désactiver des bouteilles, cocktails…</p>
        </Link>
      </div>
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
