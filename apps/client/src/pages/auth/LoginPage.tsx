import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  signInWithMagicLink,
  signInWithPassword,
  signInWithGoogle,
  signOut,
  getClient,
} from '@sev7/shared'

type Mode = 'password' | 'magic'
type PasswordAction = 'signin' | 'signup'

export function LoginPage() {
  const location = useLocation() as { state?: { from?: string } }
  const redirectAfter = location.state?.from ?? '/'

  const [mode, setMode] = useState<Mode>('password')
  const [action, setAction] = useState<PasswordAction>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setBusy(true)
    setError(null)
    const { error } = await signInWithGoogle(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectAfter)}`,
    )
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signInWithMagicLink(
      email,
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectAfter)}`,
    )
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    if (action === 'signup') {
      const sb = getClient()
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: fullName ? { full_name: fullName } : undefined,
        },
      })
      setBusy(false)
      if (error) setError(error.message)
      else window.location.href = redirectAfter
      return
    }

    const { error } = await signInWithPassword(email, password)
    setBusy(false)
    if (error) setError(error.message)
    else window.location.href = redirectAfter
  }

  return (
    <main className="auth-page">
      <Link to="/" className="back-link">← Accueil</Link>
      <h1>{action === 'signup' ? 'Créer un compte' : 'Connexion'}</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>
        {action === 'signup'
          ? 'Crée ton compte pour acheter tes billets et gérer tes réservations.'
          : 'Connecte-toi pour acheter tes billets et gérer tes réservations.'}
      </p>

      {sent ? (
        <div style={{ marginTop: '1.5rem' }}>
          <p>
            Un lien de connexion a été envoyé à <strong>{email}</strong>.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-mute)', marginTop: '0.5rem' }}>
            Pense à vérifier tes spams.
          </p>
          <button
            type="button"
            className="btn-outline"
            style={{ marginTop: '1rem' }}
            onClick={async () => {
              await signOut()
              setSent(false)
              setEmail('')
            }}
          >
            Utiliser un autre email
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn-google"
            onClick={handleGoogle}
            disabled={busy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.96h5.52a4.78 4.78 0 0 1-2.07 3.13v2.6h3.34c1.95-1.8 3.07-4.45 3.07-7.6 0-.7-.06-1.4-.18-2.07Z"/>
              <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.34-2.6c-.93.62-2.12.99-3.28.99a5.78 5.78 0 0 1-5.43-3.99H3.13v2.5A9.96 9.96 0 0 0 12 22Z"/>
              <path fill="#FBBC05" d="M6.57 13.98a5.93 5.93 0 0 1 0-3.96V7.52H3.13a9.97 9.97 0 0 0 0 8.96l3.44-2.5Z"/>
              <path fill="#4285F4" d="M12 6.05c1.47 0 2.78.5 3.81 1.49l2.85-2.85A9.62 9.62 0 0 0 12 2 9.96 9.96 0 0 0 3.13 7.52l3.44 2.5A5.78 5.78 0 0 1 12 6.05Z"/>
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

          {mode === 'magic' ? (
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
              {action === 'signup' && (
                <label>
                  Nom complet
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    placeholder="Ton nom"
                  />
                </label>
              )}
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
                  minLength={6}
                  autoComplete={action === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="6 caractères minimum"
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy
                  ? 'En cours…'
                  : action === 'signup'
                    ? 'Créer mon compte'
                    : 'Se connecter'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                {action === 'signin' ? (
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setAction('signup')
                      setError(null)
                    }}
                  >
                    Pas encore de compte ? <strong>Créer un compte</strong>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setAction('signin')
                      setError(null)
                    }}
                  >
                    Déjà un compte ? <strong>Se connecter</strong>
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </main>
  )
}
