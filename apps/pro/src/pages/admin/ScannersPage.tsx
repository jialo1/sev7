import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '@sev7/shared'

type ScannerRow = {
  id: string
  email: string
  full_name: string | null
  parent_organizer_id: string | null
  created_at: string
}

type ScannerWithStats = ScannerRow & {
  totalScans: number
  scansToday: number
  active: boolean
}

export function OrganizerScannersPage() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'

  const [scanners, setScanners] = useState<ScannerWithStats[]>([])
  const [quota, setQuota] = useState<number>(3)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<
    { kind: 'ok' | 'err'; text: string } | null
  >(null)
  const [createEmail, setCreateEmail] = useState('')
  const [createEmailConfirm, setCreateEmailConfirm] = useState('')
  const [createName, setCreateName] = useState('')
  const [createPassword, setCreatePassword] = useState('')

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Quota du caller (admin → infini)
    if (!isAdmin) {
      const { data: me } = await supabase
        .from('profiles')
        .select('max_scanners')
        .eq('id', user.id)
        .maybeSingle()
      setQuota(me?.max_scanners ?? 3)
    } else {
      setQuota(Number.POSITIVE_INFINITY)
    }

    // Liste scanners scopée
    let q = supabase
      .from('profiles')
      .select(
        'id, full_name, parent_organizer_id, created_at',
      )
      .eq('role', 'scanner')
      .order('created_at', { ascending: false })
    if (!isAdmin) q = q.eq('parent_organizer_id', user.id)

    const { data: rows } = await q
    const baseRows = (rows ?? []) as Omit<ScannerRow, 'email'>[]
    if (baseRows.length === 0) {
      setScanners([])
      setLoading(false)
      return
    }

    const ids = baseRows.map((r) => r.id)

    // Total scans + scans aujourd'hui via bookings.scanned_by
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const [{ data: scanRows }, { data: scanTodayRows }] = await Promise.all([
      supabase
        .from('bookings')
        .select('scanned_by')
        .in('scanned_by', ids),
      supabase
        .from('bookings')
        .select('scanned_by')
        .in('scanned_by', ids)
        .gte('scanned_at', dayStart.toISOString()),
    ])

    const totalMap = new Map<string, number>()
    ;(scanRows ?? []).forEach((r) => {
      if (!r.scanned_by) return
      totalMap.set(r.scanned_by, (totalMap.get(r.scanned_by) ?? 0) + 1)
    })
    const todayMap = new Map<string, number>()
    ;(scanTodayRows ?? []).forEach((r) => {
      if (!r.scanned_by) return
      todayMap.set(r.scanned_by, (todayMap.get(r.scanned_by) ?? 0) + 1)
    })

    // Email & active n'est pas accessible via select profiles direct → on
    // l'omet pour le MVP : email = full_name fallback, active = true.
    setScanners(
      baseRows.map((r) => ({
        ...r,
        email: r.full_name ?? '—',
        totalScans: totalMap.get(r.id) ?? 0,
        scansToday: todayMap.get(r.id) ?? 0,
        active: true,
      })),
    )
    setLoading(false)
  }, [user, isAdmin])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createScanner(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const email = createEmail.trim().toLowerCase()
    const emailConfirm = createEmailConfirm.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ kind: 'err', text: "Email invalide." })
      return
    }
    if (email !== emailConfirm) {
      setMessage({ kind: 'err', text: 'Les deux emails ne correspondent pas.' })
      return
    }
    if (createPassword.length < 6) {
      setMessage({
        kind: 'err',
        text: 'Mot de passe trop court (6 caractères min).',
      })
      return
    }

    setBusy(true)
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean
      error?: string
      quota?: number
    }>('organizer-create-scanner', {
      body: {
        email,
        password: createPassword,
        full_name: createName.trim() || null,
      },
    })
    setBusy(false)
    if (error || !data?.ok) {
      setMessage({
        kind: 'err',
        text:
          data?.error === 'quota_reached'
            ? `Quota atteint (${data.quota}). Contacte un admin pour l'augmenter.`
            : data?.error ?? error?.message ?? 'Création impossible.',
      })
      return
    }
    setMessage({ kind: 'ok', text: `Scanner ${email} créé.` })
    setCreateEmail('')
    setCreateEmailConfirm('')
    setCreatePassword('')
    setCreateName('')
    await refresh()
  }

  async function removeScanner(id: string, email: string) {
    if (!window.confirm(`Supprimer définitivement le scanner ${email} ?`)) return
    const { error } = await supabase.functions.invoke('organizer-toggle-scanner', {
      body: { scanner_id: id, action: 'delete' },
    })
    if (error) {
      setMessage({ kind: 'err', text: error.message })
      return
    }
    await refresh()
  }

  const slotsUsed = scanners.length
  const remaining =
    quota === Number.POSITIVE_INFINITY
      ? '∞'
      : Math.max(0, quota - slotsUsed).toString()
  const quotaReached =
    quota !== Number.POSITIVE_INFINITY && slotsUsed >= quota

  return (
    <div className="admin-page">
      <div className="admin-hero">
        <h1 className="admin-h1">Mes scanners</h1>
        <p className="admin-hero-sub">
          Crée des comptes pour tes agents de porte. Ils ne pourront que scanner
          les billets et consulter leur propre activité — aucun chiffre
          d'affaires ni détail commande ne leur est exposé.
        </p>
      </div>

      <article className="admin-card admin-card--lg" style={{ marginBottom: '1.5rem' }}>
        <h2 className="admin-card-title">Créer un scanner</h2>
        <p className="admin-card-meta" style={{ marginBottom: '1rem' }}>
          {slotsUsed} / {quota === Number.POSITIVE_INFINITY ? '∞' : quota} ·{' '}
          {remaining} restant{remaining === '1' ? '' : 's'}.
        </p>
        <form onSubmit={createScanner} className="admin-form admin-form--inline">
          <label>
            Email
            <input
              type="email"
              required
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              className="admin-input"
              placeholder="agent@portier.sn"
              disabled={busy || quotaReached}
              autoComplete="off"
            />
          </label>
          <label>
            Confirmer email
            <input
              type="email"
              required
              value={createEmailConfirm}
              onChange={(e) => setCreateEmailConfirm(e.target.value)}
              className="admin-input"
              placeholder="agent@portier.sn"
              disabled={busy || quotaReached}
              autoComplete="off"
            />
          </label>
          <label>
            Nom affiché (optionnel)
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="admin-input"
              placeholder="Mamadou D."
              disabled={busy || quotaReached}
            />
          </label>
          <label>
            Mot de passe initial
            <input
              type="text"
              required
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="admin-input"
              placeholder="6 caractères min."
              disabled={busy || quotaReached}
              autoComplete="new-password"
            />
          </label>
          <div className="admin-form-actions">
            <button
              type="submit"
              className="btn-primary btn-primary--inline"
              disabled={busy || quotaReached}
            >
              {busy ? 'Création…' : 'Créer'}
            </button>
            {quotaReached && (
              <span className="admin-card-empty">Quota atteint.</span>
            )}
          </div>
        </form>
        {message && (
          <p
            className={message.kind === 'ok' ? 'success' : 'error'}
            style={{ marginTop: '0.75rem' }}
          >
            {message.text}
          </p>
        )}
      </article>

      <article className="admin-card admin-card--lg">
        <h2 className="admin-card-title">Liste des scanners</h2>
        {loading ? (
          <p className="admin-card-empty">Chargement…</p>
        ) : scanners.length === 0 ? (
          <p className="admin-card-empty">
            Aucun scanner pour l'instant. Crée le premier ci-dessus.
          </p>
        ) : (
          <ul className="admin-recent">
            {scanners.map((s) => (
              <li key={s.id}>
                <div className="admin-recent-main">
                  <span className="admin-recent-title">
                    {s.full_name ?? s.email}
                  </span>
                  <span className="admin-recent-meta">
                    {s.totalScans} scans · {s.scansToday} aujourd'hui
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-outline btn-outline--compact"
                  onClick={() => removeScanner(s.id, s.full_name ?? s.email)}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
