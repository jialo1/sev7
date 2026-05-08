import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClient } from '@sev7/shared'

export function ProCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    getClient()
      .auth.getSession()
      .then(({ data }) => {
        navigate(data.session ? '/' : '/auth/login', { replace: true })
      })
  }, [navigate])

  return <p className="page-loading">Connexion en cours…</p>
}
