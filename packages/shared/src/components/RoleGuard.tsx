import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { ProfileRole } from '../types'

type Props = {
  role?: ProfileRole | ProfileRole[]
  requireAuth?: boolean
  children: ReactNode
}

export function RoleGuard({ role, requireAuth = true, children }: Props) {
  const { session, role: currentRole, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="page-loading">Chargement…</div>

  if (requireAuth && !session) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  }

  if (role) {
    const allowed = Array.isArray(role) ? role : [role]
    if (!currentRole || !allowed.includes(currentRole)) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
