import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { TopNav } from './components/TopNav'
import { CustomerOnly } from './components/CustomerOnly'
import './App.css'

const NAV_HIDDEN_PREFIXES = ['/auth/']

function isFunnelPath(pathname: string): boolean {
  // Pages dans un funnel d'achat : pas de BottomNav, pour libérer l'espace
  // pour les CTA (« Choisir ma table », « Payer ») et éviter les distractions.
  if (pathname.startsWith('/checkout/')) return true
  if (/^\/events\/[^/]+\/seats$/.test(pathname)) return true
  if (/^\/events\/[^/]+$/.test(pathname)) return true
  return false
}

export default function App() {
  const { pathname } = useLocation()
  const showAnyNav = !NAV_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))
  const showBottomNav = showAnyNav && !isFunnelPath(pathname)

  return (
    <div className="app-root">
      {showAnyNav && <TopNav />}
      <CustomerOnly>
        <Outlet />
      </CustomerOnly>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
