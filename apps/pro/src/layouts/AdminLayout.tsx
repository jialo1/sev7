import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { AdminSidebar } from '../components/admin/Sidebar'
import { signOut, useAuth } from '@sev7/shared'

export function AdminLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="admin-layout">
      <button
        type="button"
        className="admin-burger"
        aria-label="Ouvrir le menu"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      <div className={`admin-sidebar-wrap${open ? ' open' : ''}`}>
        <AdminSidebar />
        {open && (
          <div
            className="admin-backdrop"
            role="presentation"
            onClick={() => setOpen(false)}
          />
        )}
      </div>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-topbar-brand">SEV7 PRO</span>
          <span className="admin-topbar-user">
            {user?.email}
            <button
              type="button"
              className="btn-outline btn-outline--compact"
              onClick={() => signOut()}
            >
              Déconnexion
            </button>
          </span>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
