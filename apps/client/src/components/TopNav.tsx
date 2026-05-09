import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@sev7/shared'

const links = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/events', label: 'Soirées' },
  { to: '/restaurant', label: 'Restaurant' },
  { to: '/menu', label: 'Menu' },
]

export function TopNav() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim()
    navigate(q ? `/events?q=${encodeURIComponent(q)}` : '/events')
  }

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link to="/" className="top-logo">
          <span className="top-logo-mark">SEV7</span>
        </Link>

        <nav className="top-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="top-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="top-actions">
          {loading ? (
            <span className="top-action-skeleton" aria-hidden />
          ) : session ? (
            <>
              <Link to="/account" className="top-action-link">
                Mon compte
              </Link>
              <Link
                to="/account"
                className="top-avatar"
                aria-label="Mon compte"
                title="Mon compte"
              >
                {session.user?.email?.[0]?.toUpperCase() ?? '?'}
              </Link>
            </>
          ) : (
            <Link to="/auth/login" className="btn-outline btn-outline--compact">
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
