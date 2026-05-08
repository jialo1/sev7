import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '@sev7/shared'

export function AccountProfilePage() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? '')
        setPhone(data?.phone ?? '')
        setLoading(false)
      })
  }, [user?.id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setBusy(true)
    setFeedback(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
      .eq('id', user.id)
    setBusy(false)
    if (error) setFeedback({ kind: 'err', msg: error.message })
    else setFeedback({ kind: 'ok', msg: 'Profil mis à jour.' })
  }

  if (loading) return <p className="page-loading">Chargement…</p>

  return (
    <main className="account-page">
      <header className="page-head">
        <h1>Profil</h1>
        <Link to="/account" className="back-link">← Mon compte</Link>
      </header>

      <form onSubmit={submit} className="auth-page" style={{ marginTop: 0 }}>
        <label>
          Nom complet
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ton nom"
          />
        </label>
        <label>
          Téléphone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+221 …"
          />
        </label>

        {feedback && (
          <p className={feedback.kind === 'ok' ? 'success-msg' : 'error'}>
            {feedback.msg}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </main>
  )
}
