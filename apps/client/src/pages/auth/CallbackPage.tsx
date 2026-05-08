import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate(data.session ? '/' : '/auth/login', { replace: true })
    })
  }, [navigate])

  return <p className="page-loading">Connexion en cours…</p>
}
