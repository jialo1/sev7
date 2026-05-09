import { NavLink } from 'react-router-dom'

const links = [
  {
    to: '/',
    label: 'Accueil',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l9-8 9 8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/events',
    label: 'Soirées',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/menu',
    label: 'Menu',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3v8a3 3 0 11-3 0V3M9 3h0M16 3v18M16 14a4 4 0 004-4V3h-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/tickets',
    label: 'Billets',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M4 9a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 100-4V9z"
          strokeLinejoin="round"
        />
        <path d="M11 8v8" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Commandes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 7h14l-1.5 11.2A2 2 0 0115.5 20h-7a2 2 0 01-2-1.8L5 7z" strokeLinejoin="round" />
        <path d="M9 7V5a3 3 0 016 0v2" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {l.icon}
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
