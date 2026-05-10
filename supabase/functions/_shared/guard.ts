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

/**
 * Vérifie que le caller est organizer ou admin. Retourne le rôle du caller
 * pour permettre à la fonction d'adapter le scope.
 */
export async function requireOrganizerOrAdmin(req: Request) {
  const user = await userFromAuthHeader(req)
  if (!user) return { error: json({ error: 'unauthorized' }, { status: 401 }) }

  const sb = adminClient()
  const { data: profile } = await sb
    .from('profiles')
    .select('role, max_scanners')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || (profile.role !== 'organizer' && profile.role !== 'admin')) {
    return { error: json({ error: 'forbidden' }, { status: 403 }) }
  }

  return { user, sb, role: profile.role as 'organizer' | 'admin', maxScanners: profile.max_scanners as number }
}
