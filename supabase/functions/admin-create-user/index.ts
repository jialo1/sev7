// Création d'un user par l'admin : email + password + (optionnel) nom, tél, rôle.
import { json, preflight } from '../_shared/cors.ts'
import { requireAdmin } from '../_shared/guard.ts'

const ROLES = ['customer', 'scanner', 'staff', 'admin'] as const
type Role = (typeof ROLES)[number]

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 })

  const guard = await requireAdmin(req)
  if ('error' in guard) return guard.error
  const sb = guard.sb

  const { email, password, full_name, phone, role } = await req.json()

  if (typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'invalid_email' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return json({ error: 'password_too_short' }, { status: 400 })
  }
  if (role && !ROLES.includes(role as Role)) {
    return json({ error: 'invalid_role' }, { status: 400 })
  }

  // 1) Créer le user dans auth.users
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: full_name ? { full_name } : undefined,
  })
  if (createErr) return json({ error: createErr.message }, { status: 400 })
  if (!created.user) return json({ error: 'create_failed' }, { status: 500 })

  // 2) Compléter le profil (le trigger handle_new_user a inséré full_name + phone via metadata)
  const updates: Record<string, unknown> = {}
  if (full_name) updates.full_name = full_name
  if (phone) updates.phone = phone
  if (role && role !== 'customer') updates.role = role

  if (Object.keys(updates).length > 0) {
    const { error: profileErr } = await sb
      .from('profiles')
      .update(updates)
      .eq('id', created.user.id)
    if (profileErr) return json({ error: profileErr.message }, { status: 500 })
  }

  return json({
    ok: true,
    user: {
      id: created.user.id,
      email: created.user.email,
      full_name: full_name ?? null,
      phone: phone ?? null,
      role: role ?? 'customer',
    },
  })
})
