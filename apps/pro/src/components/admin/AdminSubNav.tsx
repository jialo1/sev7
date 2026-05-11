import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@sev7/shared'

type Item = { to: string; label: string; isActive: (path: string) => boolean }

const ADMIN_ITEMS: Item[] = [
  { to: '/admin', label: "Vue d'ensemble", isActive: (p) => p === '/admin' },
  {
    to: '/admin/events',
    label: 'Soirées',
    isActive: (p) => p.startsWith('/admin/events'),
  },
  { to: '/admin/menu', label: 'Menu', isActive: (p) => p.startsWith('/admin/menu') },
  {
    to: '/admin/bookings',
    label: 'Réservations',
    isActive: (p) => p.startsWith('/admin/bookings'),
  },
  {
    to: '/admin/users',
    label: 'Utilisateurs',
    isActive: (p) => p.startsWith('/admin/users'),
  },
  {
    to: '/admin/tables',
    label: 'Plan de salle',
    isActive: (p) => p.startsWith('/admin/tables'),
  },
  {
    to: '/admin/stats',
    label: 'Statistiques',
    isActive: (p) => p.startsWith('/admin/stats'),
  },
  {
    to: '/admin/audit',
    label: 'Audit',
    isActive: (p) => p.startsWith('/admin/audit'),
  },
]

const ORGANIZER_ITEMS: Item[] = [
  { to: '/admin', label: 'Vue prestataire', isActive: (p) => p === '/admin' },
  {
    to: '/admin/events',
    label: 'Mes soirées',
    isActive: (p) => p.startsWith('/admin/events'),
  },
  {
    to: '/admin/scanners',
    label: 'Mes scanners',
    isActive: (p) => p.startsWith('/admin/scanners'),
  },
  {
    to: '/admin/bookings',
    label: 'Réservations',
    isActive: (p) => p.startsWith('/admin/bookings'),
  },
]

export function AdminSubNav() {
  const { pathname } = useLocation()
  const { role } = useAuth()
  const items = role === 'organizer' ? ORGANIZER_ITEMS : ADMIN_ITEMS
  const label =
    role === 'organizer' ? 'Sections prestataire' : 'Sections administration'

  return (
    <nav aria-label={label} className="admin-subnav">
      {items.map(({ to, label, isActive }) => (
        <Link
          key={to}
          to={to}
          className={`admin-pill${isActive(pathname) ? ' admin-pill--active' : ''}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
