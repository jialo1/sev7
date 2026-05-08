import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  signInWithMagicLink,
  signInWithPassword,
} from '@sev7/shared'

type Mode = 'magic' | 'password'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const redirectAfter = location.state?.from ?? '/'

  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signInWithPassword(email, password)
    setBusy(false)
    if (error) setError(error.message)
    else navigate(redirectAfter, { replace: true })
  }

  return (
    <main className="auth-page">
      <Link to="/" className="back-link">← Accueil</Link>
      <h1>Connexion</h1>

      <div className="segmented" role="tablist" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'magic'}
          className={mode === 'magic' ? 'active' : ''}
          onClick={() => {
            setMode('magic')
            setError(null)
            setSent(false)
          }}
        >
          Lien magique
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'password'}
          className={mode === 'password' ? 'active' : ''}
          onClick={() => {
            setMode('password')
            setError(null)
            setSent(false)
          }}
        >
          Mot de passe
        </button>
      </div>

      {mode === 'magic' && sent ? (
        <p>
          Un lien de connexion a été envoyé à <strong>{email}</strong>.
          <br />
          <small style={{ color: 'var(--text-mute)' }}>
            En dev, ouvre Mailpit (http://127.0.0.1:54324) pour le récupérer.
          </small>
        </p>
      ) : mode === 'magic' ? (
        <form onSubmit={handleMagicLink}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="ton@email.com"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Envoi…' : 'Recevoir un lien de connexion'}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePassword}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="ton@email.com"
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
              minLength={6}
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
                <li>
                  <code>admin@test.com</code> / <code>adminpass123</code> →
                  rôle admin
                </li>
                <li>
                  <code>porter@test.com</code> / <code>porterpass123</code> →
                  rôle scanner
                </li>
                <li>
                  <code>client@test.com</code> / <code>clientpass123</code> →
                  rôle customer
                </li>
              </ul>
            </details>
          )}
        </form>
      )}
    </main>
  )
}
