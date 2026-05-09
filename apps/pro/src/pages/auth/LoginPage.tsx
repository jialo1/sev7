import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  signInWithPassword,
  signInWithMagicLink,
  signInWithGoogle,
  useAuth,
} from '@sev7/shared'

type Mode = 'password' | 'magic'

export function ProLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const prefilledEmail = params.get('email') ?? ''
  const { session, loading } = useAuth()

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState(prefilledEmail)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (loading) return <p className="page-loading">Chargement…</p>
  if (session) return <Navigate to="/" replace />

  async function handleGoogle() {
    setBusy(true)
    setError(null)
    const { error } = await signInWithGoogle(
      `${window.location.origin}/auth/callback`,
    )
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

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
        ) : (
          <>
            <button
              type="button"
              className="btn-google"
              onClick={handleGoogle}
              disabled={busy}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="#EA4335" d="M12 10.2v3.96h5.52a4.78 4.78 0 0 1-2.07 3.13v2.6h3.34c1.95-1.8 3.07-4.45 3.07-7.6 0-.7-.06-1.4-.18-2.07Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.34-2.6c-.93.62-2.12.99-3.28.99a5.78 5.78 0 0 1-5.43-3.99H3.13v2.5A9.96 9.96 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.57 13.98a5.93 5.93 0 0 1 0-3.96V7.52H3.13a9.97 9.97 0 0 0 0 8.96l3.44-2.5Z" />
                <path fill="#4285F4" d="M12 6.05c1.47 0 2.78.5 3.81 1.49l2.85-2.85A9.62 9.62 0 0 0 12 2 9.96 9.96 0 0 0 3.13 7.52l3.44 2.5A5.78 5.78 0 0 1 12 6.05Z" />
              </svg>
              Continuer avec Google
            </button>

            <div className="separator">
              <span>ou avec ton email</span>
            </div>

            <div className="segmented" role="tablist" style={{ marginBottom: '0.85rem' }}>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'password'}
                className={mode === 'password' ? 'active' : ''}
                onClick={() => {
                  setMode('password')
                  setError(null)
                }}
              >
                Mot de passe
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'magic'}
                className={mode === 'magic' ? 'active' : ''}
                onClick={() => {
                  setMode('magic')
                  setError(null)
                }}
              >
                Lien magique
              </button>
            </div>

            {mode === 'password' ? (
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
              </form>
            )}
          </>
        )}
      </div>
    </main>
  )
}
