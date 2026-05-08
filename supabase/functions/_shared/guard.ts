import { adminClient, userFromAuthHeader } from './supabase.ts'
import { json } from './cors.ts'

/**
 * Vérifie que le caller est admin. Retourne soit la `user` admin, soit une
 * Response d'erreur prête à être renvoyée.
 */
export async function requireAdmin(req: Request) {
  const user = await userFromAuthHeader(req)
  if (!user) return { error: json({ error: 'unauthorized' }, { status: 401 }) }

  const sb = adminClient()
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return { error: json({ error: 'forbidden' }, { status: 403 }) }
  }

  return { user, sb }
}
