import { NavLink } from 'react-router-dom'

type Item = { to: string; label: string; icon: React.ReactNode; end?: boolean }

const ITEMS: Item[] = [
  {
    to: '/admin',
    label: 'Vue d\'ensemble',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/admin/events',
    label: 'Soirées',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    to: '/admin/menu',
    label: 'Menu',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 4v16M5 12h7a4 4 0 100-8H5M16 4v16M19 4l-1 6 2 1v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/admin/bookings',
    label: 'Réservations',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 9a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 100-4V9z" />
        <path d="M11 8v8" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Utilisateurs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20a6 6 0 0112 0M16 11a3 3 0 100-6M21 20a5 5 0 00-4-4.9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/admin/tables',
    label: 'Plan de salle',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 9v12M9 15h12" />
      </svg>
    ),
  },
  {
    to: '/admin/stats',
    label: 'Statistiques',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 20h18M7 16V10M12 16V4M17 16v-8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar" aria-label="Navigation admin">
      <div className="admin-sidebar-head">
        <span className="top-logo-mark">SEV7 ADMIN</span>
      </div>
      <nav>
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `admin-nav-item${isActive ? ' active' : ''}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
