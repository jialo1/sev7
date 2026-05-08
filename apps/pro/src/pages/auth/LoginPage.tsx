import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signInWithPassword, signInWithMagicLink, useAuth } from '@sev7/shared'

type Mode = 'password' | 'magic'

export function ProLoginPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (loading) return <p className="page-loading">Chargement…</p>
  if (session) return <Navigate to="/" replace />

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signInWithPassword(email, password)
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/', { replace: true })
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signInWithMagicLink(
      email,
      `${window.location.origin}/auth/callback`,
    )
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main className="pro-auth">
      <div className="pro-auth-card">
        <span className="pro-logo">SEV7 PRO</span>
        <h1>Espace équipe</h1>
        <p>Réservé aux admin, staff et scanners.</p>

        {sent ? (
          <p>
            Un lien de connexion a été envoyé à <strong>{email}</strong>.
            <br />
            <small style={{ color: 'var(--text-mute)' }}>
              En dev : http://127.0.0.1:54324 (Mailpit).
            </small>
          </p>
        ) : mode === 'password' ? (
          <form onSubmit={handlePassword}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              className="btn-outline btn-outline--compact"
              onClick={() => {
                setMode('magic')
                setError(null)
              }}
            >
              Recevoir un lien magique à la place
            </button>

            {import.meta.env.DEV && (
              <details className="dev-hint">
                <summary>Comptes de test (dev local)</summary>
                <ul>
                  <li><code>admin@test.com</code> / <code>adminpass123</code> → admin</li>
                  <li><code>porter@test.com</code> / <code>porterpass123</code> → scanner</li>
                </ul>
              </details>
            )}
          </form>
        ) : (
          <form onSubmit={handleMagicLink}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Envoi…' : 'Envoyer un lien'}
            </button>
            <button
              type="button"
              className="btn-outline btn-outline--compact"
              onClick={() => setMode('password')}
            >
              Retour au mot de passe
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
