import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AdminContentLoadingWire } from '../../components/LoadingWire'

type AuditRow = {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_role: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

const PAGE_SIZE = 50

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function actionTone(action: string): 'ok' | 'warn' | 'danger' | 'info' {
  if (action.startsWith('payment.') && action.includes('refused')) return 'danger'
  if (action.startsWith('payment.')) return 'ok'
  if (action.startsWith('email.') && action.includes('failed')) return 'danger'
  if (action.startsWith('email.')) return 'info'
  if (action.startsWith('ticket.')) return 'ok'
  if (action.includes('deleted')) return 'danger'
  if (action.includes('disabled')) return 'warn'
  return 'info'
}

export function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [filterActor, setFilterActor] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('audit_logs')
      .select(
        'id, actor_id, actor_email, actor_role, action, resource_type, resource_id, metadata, ip, user_agent, created_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (filterAction) q = q.ilike('action', `%${filterAction}%`)
    if (filterResource) q = q.eq('resource_type', filterResource)
    if (filterActor) q = q.ilike('actor_email', `%${filterActor}%`)

    const { data, count } = await q
    setRows((data ?? []) as AuditRow[])
    setHasMore((count ?? 0) > (page + 1) * PAGE_SIZE)
    setLoading(false)
  }, [page, filterAction, filterResource, filterActor])

  useEffect(() => {
    void fetch()
  }, [fetch])

  function applyFilters() {
    setPage(0)
    void fetch()
  }

  function reset() {
    setFilterAction('')
    setFilterResource('')
    setFilterActor('')
    setPage(0)
  }

  const resourceTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.resource_type))
    return Array.from(set).sort()
  }, [rows])

  if (loading && rows.length === 0) return <AdminContentLoadingWire />

  return (
    <div className="admin-page">
      <div className="admin-hero">
        <h1 className="admin-h1">Journal d'audit</h1>
        <p className="admin-hero-sub">
          Trace des actions admin / organizer / paiement / ticket. RLS limite la
          lecture aux admins.
        </p>
      </div>

      <article className="admin-card admin-card--lg" style={{ marginBottom: '1rem' }}>
        <form
          className="admin-form admin-form--inline"
          onSubmit={(e) => {
            e.preventDefault()
            applyFilters()
          }}
        >
          <label>
            Action
            <input
              type="text"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder="payment, admin, ticket…"
              className="admin-input"
            />
          </label>
          <label>
            Ressource
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="admin-input"
            >
              <option value="">— toutes —</option>
              <option value="booking">booking</option>
              <option value="user">user</option>
              <option value="event">event</option>
            </select>
          </label>
          <label>
            Email acteur
            <input
              type="text"
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              placeholder="admin@…"
              className="admin-input"
            />
          </label>
          <div className="admin-form-actions">
            <button type="submit" className="btn-primary btn-primary--inline">
              Filtrer
            </button>
            <button type="button" className="btn-outline" onClick={reset}>
              Réinitialiser
            </button>
          </div>
        </form>
      </article>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Acteur</th>
              <th>Action</th>
              <th>Ressource</th>
              <th>IP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="admin-cell-mono">{formatDate(r.created_at)}</td>
                  <td>
                    <strong>{r.actor_email ?? '—'}</strong>
                    {r.actor_role && (
                      <>
                        <br />
                        <span className="admin-cell-dim">{r.actor_role}</span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={`audit-action audit-action--${actionTone(r.action)}`}>
                      {r.action}
                    </span>
                  </td>
                  <td>
                    {r.resource_type}
                    {r.resource_id && (
                      <>
                        <br />
                        <span className="admin-cell-mono admin-cell-dim">
                          {r.resource_id.slice(0, 8)}…
                        </span>
                      </>
                    )}
                  </td>
                  <td className="admin-cell-mono admin-cell-dim">{r.ip ?? '—'}</td>
                  <td>{expandedId === r.id ? '▾' : '▸'}</td>
                </tr>
                {expandedId === r.id && (
                  <tr>
                    <td colSpan={6} style={{ background: 'var(--bg-2)' }}>
                      <pre className="audit-meta">
{JSON.stringify(
  {
    resource_id: r.resource_id,
    metadata: r.metadata,
    user_agent: r.user_agent,
  },
  null,
  2,
)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <p className="empty">Aucune ligne d'audit.</p>
        )}
      </div>

      <div className="admin-pager">
        <button
          type="button"
          className="btn-outline btn-outline--compact"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          ← Précédent
        </button>
        <span className="admin-cell-dim">Page {page + 1}</span>
        <button
          type="button"
          className="btn-outline btn-outline--compact"
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          Suivant →
        </button>
      </div>

      <p className="admin-hero-sub" style={{ marginTop: '1rem' }}>
        Note : {resourceTypes.length > 0 && `Types ressources sur cette page : ${resourceTypes.join(', ')}.`}
      </p>
    </div>
  )
}
