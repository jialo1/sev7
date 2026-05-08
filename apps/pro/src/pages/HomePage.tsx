import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@sev7/shared'

export function ProHomePage() {
  const { session, role, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !session || !role) return
    if (role === 'admin') navigate('/admin', { replace: true })
    else if (role === 'staff') navigate('/staff/dashboard', { replace: true })
    else if (role === 'scanner') navigate('/scan', { replace: true })
  }, [role, session, loading, navigate])

  if (loading) return <p className="page-loading">Chargement…</p>
  if (!session) return <Navigate to="/auth/login" replace />

  if (role === 'customer') {
    const clientUrl = import.meta.env.VITE_CLIENT_URL ?? 'http://localhost:5173'
    return (
      <main className="pro-no-access">
        <span className="pro-logo">SEV7 PRO</span>
        <h1>Pas d'accès</h1>
        <p>
          Cet espace est réservé aux administrateurs, staff et scanners.
          <br />
          Pour acheter un billet, va sur l'app principale.
        </p>
        <a className="btn-primary btn-primary--inline" href={clientUrl}>
          → Aller sur SEV7
        </a>
      </main>
    )
  }

  return <p className="page-loading">Redirection…</p>
}
