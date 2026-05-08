import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '@sev7/shared'
import type { ProfileRole } from '@sev7/shared'

type Row = {
  id: string
  full_name: string | null
  phone: string | null
  role: ProfileRole
  created_at: string
}

const ROLES: ProfileRole[] = ['customer', 'scanner', 'staff', 'admin']

type Modal =
  | null
  | { kind: 'create' }
  | { kind: 'edit'; row: Row }
  | { kind: 'reset'; row: Row }

export function AdminUsersPage() {
  const { user: caller } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<ProfileRole | 'all'>('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)

  async function refresh() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data ?? []) as Row[])
  }

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter((r) => filter === 'all' || r.role === filter)
      .filter(
        (r) =>
          !q ||
          r.full_name?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q) ||
          r.id.includes(q),
      )
  }, [rows, filter, search])

  async function setRole(userId: string, newRole: ProfileRole) {
    setBusyId(userId)
    setError(null)
    const { error } = await supabase.functions.invoke('admin-set-role', {
      body: { user_id: userId, new_role: newRole },
    })
    if (error) setError(error.message)
    else await refresh()
    setBusyId(null)
  }

  async function deleteUser(row: Row) {
    if (!window.confirm(`Supprimer ${row.full_name ?? row.id} ? Action irréversible.`)) return
    setBusyId(row.id)
    setError(null)
    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: row.id },
    })
    if (error) setError(error.message)
    else {
      setFeedback('Utilisateur supprimé.')
      await refresh()
    }
    setBusyId(null)
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1 className="admin-h1">Utilisateurs</h1>
        <button
          type="button"
          className="btn-primary btn-primary--inline"
          onClick={() => setModal({ kind: 'create' })}
        >
          + Nouveau
        </button>
      </header>

      <div className="admin-filters">
        <input
          type="search"
          placeholder="Rechercher (nom, tél, id)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ProfileRole | 'all')}
          className="admin-input admin-input--inline"
        >
          <option value="all">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {feedback && <p style={{ color: 'var(--success)' }}>{feedback}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom / téléphone</th>
              <th>ID</th>
              <th>Rôle</th>
              <th>Créé</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isSelf = r.id === caller?.id
              return (
                <tr key={r.id}>
                  <td>
                    <strong>{r.full_name ?? '—'}</strong>
                    <br />
                    <span className="admin-cell-dim">{r.phone ?? ''}</span>
                  </td>
                  <td className="admin-cell-mono">{r.id.slice(0, 8)}…</td>
                  <td>
                    {isSelf ? (
                      <span className={`badge badge--role-${r.role}`}>{r.role}</span>
                    ) : (
                      <select
                        value={r.role}
                        disabled={busyId === r.id}
                        onChange={(e) => setRole(r.id, e.target.value as ProfileRole)}
                        className="admin-input admin-input--inline"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="admin-cell-dim">
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    {isSelf ? (
                      <span className="admin-cell-dim">Vous</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="admin-link"
                          onClick={() => setModal({ kind: 'edit', row: r })}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="admin-link"
                          onClick={() => setModal({ kind: 'reset', row: r })}
                        >
                          Reset MDP
                        </button>
                        <button
                          type="button"
                          className="admin-link admin-link--danger"
                          disabled={busyId === r.id}
                          onClick={() => deleteUser(r)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="empty">Aucun utilisateur.</p>}
      </div>

      {modal?.kind === 'create' && (
        <CreateUserModal
          onClose={() => setModal(null)}
          onCreated={async (msg) => {
            setModal(null)
            setFeedback(msg)
            await refresh()
          }}
        />
      )}
      {modal?.kind === 'edit' && (
        <EditUserModal
          row={modal.row}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null)
            setFeedback('Utilisateur mis à jour.')
            await refresh()
          }}
        />
      )}
      {modal?.kind === 'reset' && (
        <ResetPasswordModal
          row={modal.row}
          onClose={() => setModal(null)}
          onDone={(msg) => {
            setModal(null)
            setFeedback(msg)
          }}
        />
      )}
    </div>
  )
}

/* ════════════════════════ Modals ════════════════════════ */

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (msg: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<ProfileRole>('scanner')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean
      user: unknown
    }>('admin-create-user', {
      body: {
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        role,
      },
    })
    setBusy(false)
    if (error || !data?.ok) {
      setError(error?.message ?? 'Création échouée')
      return
    }
    onCreated(`${email} créé en tant que ${role}.`)
  }

  return (
    <Modal title="Nouvel utilisateur" onClose={onClose}>
      <form onSubmit={submit} className="admin-form">
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="admin-input"
            autoComplete="off"
          />
        </label>
        <label>
          Mot de passe
          <input
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
            placeholder="6 caractères minimum"
          />
        </label>
        <div className="admin-form-row">
          <label>
            Nom complet
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="admin-input"
            />
          </label>
          <label>
            Téléphone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="admin-input"
              placeholder="+221 …"
            />
          </label>
        </div>
        <label>
          Rôle
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ProfileRole)}
            className="admin-input"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className="btn-primary btn-primary--inline"
            disabled={busy}
          >
            {busy ? 'Création…' : 'Créer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditUserModal({
  row,
  onClose,
  onSaved,
}: {
  row: Row
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(row.full_name ?? '')
  const [phone, setPhone] = useState(row.phone ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: {
        user_id: row.id,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      },
    })
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <Modal title="Modifier l'utilisateur" onClose={onClose}>
      <form onSubmit={submit} className="admin-form">
        <p className="admin-cell-dim">ID : {row.id}</p>
        <div className="admin-form-row">
          <label>
            Nom complet
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="admin-input"
            />
          </label>
          <label>
            Téléphone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="admin-input"
            />
          </label>
        </div>
        <p className="admin-cell-dim">
          Pour changer le rôle, utilise le menu déroulant dans la liste.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className="btn-primary btn-primary--inline"
            disabled={busy}
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({
  row,
  onClose,
  onDone,
}: {
  row: Row
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [mode, setMode] = useState<'direct' | 'magic'>('direct')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const body =
      mode === 'magic'
        ? { user_id: row.id, mode: 'magic' }
        : { user_id: row.id, password }
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean
      action_link?: string | null
    }>('admin-reset-password', { body })
    setBusy(false)
    if (error || !data?.ok) {
      setError(error?.message ?? 'Échec')
      return
    }
    if (mode === 'magic') {
      onDone(
        `Lien de récupération généré : ${data.action_link ?? 'voir Mailpit en local'}`,
      )
    } else {
      onDone('Mot de passe réinitialisé.')
    }
  }

  return (
    <Modal title={`Reset MDP — ${row.full_name ?? row.id}`} onClose={onClose}>
      <form onSubmit={submit} className="admin-form">
        <div className="segmented" role="tablist" style={{ marginBottom: '0.5rem' }}>
          <button
            type="button"
            className={mode === 'direct' ? 'active' : ''}
            onClick={() => setMode('direct')}
          >
            Définir un MDP
          </button>
          <button
            type="button"
            className={mode === 'magic' ? 'active' : ''}
            onClick={() => setMode('magic')}
          >
            Lien magique
          </button>
        </div>
        {mode === 'direct' ? (
          <label>
            Nouveau mot de passe
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
              placeholder="6 caractères minimum"
            />
          </label>
        ) : (
          <p className="admin-cell-dim">
            Un lien de récupération sera généré. Tu pourras le transmettre à l'utilisateur.
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className="btn-primary btn-primary--inline"
            disabled={busy}
          >
            {busy ? 'En cours…' : 'Confirmer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ════════════════════════ Modal générique ════════════════════════ */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
