import { Outlet } from 'react-router-dom'
import { AdminSubNav } from '../components/admin/AdminSubNav'
import { signOut, useAuth } from '@sev7/shared'

export function AdminLayout() {
  const { user } = useAuth()

  return (
    <div className="admin-layout">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-topbar-row">
            <span className="top-logo-mark">SEV7 PRO</span>
            <div className="admin-topbar-user">
              <span className="admin-topbar-email">{user?.email}</span>
              <button
                type="button"
                className="btn-outline btn-outline--compact"
                onClick={() => signOut()}
              >
                Déconnexion
              </button>
            </div>
          </div>
          <AdminSubNav />
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
