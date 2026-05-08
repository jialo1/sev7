import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth, signOut } from '@sev7/shared'

type Profile = {
  full_name: string | null
  phone: string | null
}

export function AccountHomePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile((data as Profile) ?? null))
  }, [user?.id])

  return (
    <main className="account-page">
      <header className="page-head">
        <h1>Mon compte</h1>
        <Link to="/" className="back-link">← Accueil</Link>
      </header>

      <div className="account-hero">
        <div className="account-hero-avatar">
          {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <h2>{profile?.full_name ?? user?.email}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      <div className="account-tiles">
        <Link to="/account/profile" className="account-tile">
          <strong>Profil</strong>
          <p>Nom, téléphone</p>
        </Link>
        <Link to="/tickets" className="account-tile">
          <strong>Mes billets</strong>
          <p>Soirées à venir</p>
        </Link>
        <Link to="/account/history" className="account-tile">
          <strong>Historique</strong>
          <p>Soirées passées</p>
        </Link>
        <Link to="/orders" className="account-tile">
          <strong>Mes commandes</strong>
          <p>Boissons & food</p>
        </Link>
      </div>

      <button
        type="button"
        className="btn-outline"
        style={{ marginTop: '2rem' }}
        onClick={() => signOut()}
      >
        Se déconnecter
      </button>
    </main>
  )
}
