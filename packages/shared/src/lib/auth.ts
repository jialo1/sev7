import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getClient } from './supabase'
import type { ProfileRole } from '../types'

export type AuthState = {
  session: Session | null
  user: User | null
  role: ProfileRole | null
  loading: boolean
}

type RoleEntry = { userId: string; role: ProfileRole }

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [roleEntry, setRoleEntry] = useState<RoleEntry | null>(null)

  useEffect(() => {
    const supabase = getClient()
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    const supabase = getClient()
    let active = true
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active)
          setRoleEntry({
            userId,
            role: (data?.role as ProfileRole) ?? 'customer',
          })
      })
    return () => {
      active = false
    }
  }, [userId])

  const role = roleEntry && roleEntry.userId === userId ? roleEntry.role : null

  // loading reste true tant que le rôle n'est pas synchronisé avec la session
  // courante. Sinon RoleGuard pourrait rejeter l'accès pendant la fenêtre
  // session=set / role=null.
  const loading = sessionLoading || (!!session && role === null)

  return {
    session,
    user: session?.user ?? null,
    role,
    loading,
  }
}

export async function signInWithMagicLink(email: string, redirectTo: string) {
  return getClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
}

export async function signInWithPassword(email: string, password: string) {
  return getClient().auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return getClient().auth.signOut()
}
