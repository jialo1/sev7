import { Link, Outlet } from 'react-router-dom'
import { signOut } from '@sev7/shared'

export function ScanLayout() {
  return (
    <div className="scan-layout">
      <header className="scan-layout-head">
        <Link to="/" className="top-logo">
          <span className="top-logo-mark">SEV7</span>
        </Link>
        <span className="scan-layout-tag">Mode scan</span>
        <button
          type="button"
          className="btn-outline btn-outline--compact"
          onClick={() => signOut()}
        >
          Déconnexion
        </button>
      </header>
      <main className="scan-layout-main">
        <Outlet />
      </main>
    </div>
  )
}
