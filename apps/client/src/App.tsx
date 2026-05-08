import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { TopNav } from './components/TopNav'
import './App.css'

const NAV_HIDDEN_PREFIXES = ['/auth/']

export default function App() {
  const { pathname } = useLocation()
  const showNav = !NAV_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))

  return (
    <div className="app-root">
      {showNav && <TopNav />}
      <Outlet />
      {showNav && <BottomNav />}
    </div>
  )
}
