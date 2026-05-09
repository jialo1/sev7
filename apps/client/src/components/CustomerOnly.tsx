import { useEffect } from 'react'
import { useAuth, signOut } from '@sev7/shared'

/**
 * Si un compte non-customer (admin, staff, scanner) est connecté sur l'app
 * client, on le déconnecte et on affiche un message neutre. Le client final
 * ne doit pas découvrir l'existence de l'app pro.
 */
export function CustomerOnly({ children }: { children: React.ReactNode }) {
  const { session, role, loading } = useAuth()
  const rejected =
    !!session && (role === 'admin' || role === 'staff' || role === 'scanner')

  useEffect(() => {
    if (rejected) {
      void signOut()
    }
  }, [rejected])

  if (loading) return <p className="page-loading">Chargement…</p>

  if (rejected) {
    return (
      <main className="auth-page">
        <h1>Accès non autorisé</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>
          Ce compte n'est pas un compte client. Si tu cherches à acheter un
          billet, utilise un autre email.
        </p>
        <a href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '1.5rem', textAlign: 'center', textDecoration: 'none' }}>
          Retour à l'accueil
        </a>
      </main>
    )
  }

  return <>{children}</>
}
