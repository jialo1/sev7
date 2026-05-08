import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Venue = { id: string; name: string; kind: 'club' | 'restaurant' }

type Form = {
  venue_id: string
  title: string
  room_label: string
  starts_at: string
  poster_url: string
  status: 'draft' | 'published' | 'archived'
}

const EMPTY: Form = {
  venue_id: '',
  title: '',
  room_label: 'Espace principal',
  starts_at: '',
  poster_url: '',
  status: 'draft',
}

export function AdminEventEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [venues, setVenues] = useState<Venue[]>([])
  const [form, setForm] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    supabase
      .from('venues')
      .select('id, name, kind')
      .order('name')
      .then(({ data }) => setVenues((data ?? []) as Venue[]))
  }, [])

  useEffect(() => {
    if (isNew) return
    supabase
      .from('events')
      .select('id, venue_id, title, room_label, starts_at, poster_url, status')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            venue_id: data.venue_id,
            title: data.title,
            room_label: data.room_label,
            starts_at: data.starts_at.slice(0, 16),
            poster_url: data.poster_url ?? '',
            status: data.status,
          })
        }
        setLoading(false)
      })
  }, [id, isNew])

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const payload = {
      venue_id: form.venue_id,
      title: form.title.trim(),
      room_label: form.room_label.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      poster_url: form.poster_url.trim() || null,
      status: form.status,
    }
    const { error: err } = isNew
      ? await supabase.from('events').insert(payload)
      : await supabase.from('events').update(payload).eq('id', id)
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    navigate('/admin/events')
  }

  async function archive() {
    if (!id || isNew) return
    if (!window.confirm('Archiver cette soirée ?')) return
    await supabase.from('events').update({ status: 'archived' }).eq('id', id)
    navigate('/admin/events')
  }

  if (loading) return <p className="page-loading">Chargement…</p>

  return (
    <div className="admin-page">
      <h1 className="admin-h1">{isNew ? 'Nouvelle soirée' : 'Modifier la soirée'}</h1>

      <form onSubmit={submit} className="admin-form">
        <label>
          Lieu
          <select
            required
            value={form.venue_id}
            onChange={(e) => update('venue_id', e.target.value)}
            className="admin-input"
          >
            <option value="">— choisir —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.kind})
              </option>
            ))}
          </select>
        </label>

        <label>
          Titre
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="admin-input"
            placeholder="Afro House — Invité DJ"
          />
        </label>

        <div className="admin-form-row">
          <label>
            Date et heure
            <input
              type="datetime-local"
              required
              value={form.starts_at}
              onChange={(e) => update('starts_at', e.target.value)}
              className="admin-input"
            />
          </label>

          <label>
            Salle
            <input
              type="text"
              required
              value={form.room_label}
              onChange={(e) => update('room_label', e.target.value)}
              className="admin-input"
            />
          </label>
        </div>

        <label>
          Poster (URL image)
          <input
            type="url"
            value={form.poster_url}
            onChange={(e) => update('poster_url', e.target.value)}
            className="admin-input"
            placeholder="https://…"
          />
        </label>

        <label>
          Statut
          <select
            value={form.status}
            onChange={(e) => update('status', e.target.value as Form['status'])}
            className="admin-input"
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </select>
        </label>

        {error && <p className="error">{error}</p>}

        <div className="admin-form-actions">
          <button type="submit" className="btn-primary btn-primary--inline" disabled={busy}>
            {busy ? 'Enregistrement…' : isNew ? 'Créer' : 'Enregistrer'}
          </button>
          {!isNew && (
            <button type="button" className="btn-outline" onClick={archive}>
              Archiver
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
