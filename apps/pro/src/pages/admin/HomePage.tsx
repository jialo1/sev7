import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTimeFr, formatXof, useAuth } from '@sev7/shared'
import { AdminContentLoadingWire } from '../../components/LoadingWire'

type Stats = {
  bookingsTotal: number
  bookingsToday: number
  paid: number
  pending: number
  attended: number
  cancelled: number
  revenueXof: number
  scanners: number
  events: number
}

type RecentBooking = {
  id: string
  total_xof: number
  status: string
  created_at: string
  events: { title: string } | null
  tables: { label: string } | null
}

type PaymentRow = { method: string | null; count: number }

type MyEvent = {
  id: string
  title: string
  starts_at: string
  status: string
}

const METHOD_LABELS: Record<string, string> = {
  cinetpay_wave: 'Wave',
  cinetpay_om: 'Orange Money',
  cinetpay_cb: 'Carte bancaire',
  on_site: 'Sur place',
}

export function AdminHomePage() {
  const { user, role } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentBooking[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [myEvents, setMyEvents] = useState<MyEvent[]>([])

  const isOrganizer = role === 'organizer'

  useEffect(() => {
    if (!user) return
    let active = true

    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    const load = async () => {
      // Si organizer, on récupère d'abord ses event ids pour scoper les bookings.
      let scopedEventIds: string[] | null = null
      if (isOrganizer) {
        const { data: ev } = await supabase
          .from('events')
          .select('id, title, starts_at, status')
          .eq('organizer_id', user.id)
          .order('starts_at', { ascending: false })
        const events = (ev ?? []) as MyEvent[]
        if (active) setMyEvents(events)
        scopedEventIds = events.map((e) => e.id)
      }

      // Scope helper : applique le filtre event_id IN ... aux query builders
      // bookings quand l'organizer n'a pas tous les events. `unknown` cast
      // local : Postgrest renvoie le même builder type sur eq/in.
      const scopeBookings = <Q,>(q: Q): Q => {
        if (scopedEventIds === null) return q
        const builder = q as unknown as {
          eq: (col: string, val: string) => Q
          in: (col: string, vals: string[]) => Q
        }
        if (scopedEventIds.length === 0) {
          return builder.eq('id', '00000000-0000-0000-0000-000000000000')
        }
        return builder.in('event_id', scopedEventIds)
      }

      const [
        bkAll,
        bkToday,
        paid,
        pending,
        attended,
        cancelled,
        revRows,
        sc,
        ev,
        recentRows,
        payRows,
      ] = await Promise.all([
        scopeBookings(supabase.from('bookings').select('id', { count: 'exact', head: true })),
        scopeBookings(
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString()),
        ),
        scopeBookings(
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'paid'),
        ),
        scopeBookings(
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'reserved')
            .eq('payment_method', 'on_site'),
        ),
        scopeBookings(
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'attended'),
        ),
        scopeBookings(
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'cancelled'),
        ),
        scopedEventIds === null
          ? supabase.from('bookings').select('total_xof').in('status', ['paid', 'attended'])
          : scopedEventIds.length === 0
            ? Promise.resolve({ data: [] as { total_xof: number }[] })
            : supabase
                .from('bookings')
                .select('total_xof')
                .in('status', ['paid', 'attended'])
                .in('event_id', scopedEventIds),
        isOrganizer
          ? supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('role', 'scanner')
              .eq('parent_organizer_id', user.id)
          : supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('role', 'scanner'),
        isOrganizer
          ? supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('organizer_id', user.id)
          : supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'published'),
        scopedEventIds === null
          ? supabase
              .from('bookings')
              .select(
                'id, total_xof, status, created_at, events(title), tables(label)',
              )
              .order('created_at', { ascending: false })
              .limit(8)
          : scopedEventIds.length === 0
            ? Promise.resolve({ data: [] as RecentBooking[] })
            : supabase
                .from('bookings')
                .select(
                  'id, total_xof, status, created_at, events(title), tables(label)',
                )
                .in('event_id', scopedEventIds)
                .order('created_at', { ascending: false })
                .limit(8),
        scopedEventIds === null
          ? supabase
              .from('bookings')
              .select('payment_method')
              .not('payment_method', 'is', null)
              .in('status', ['paid', 'attended', 'reserved'])
          : scopedEventIds.length === 0
            ? Promise.resolve({ data: [] as { payment_method: string }[] })
            : supabase
                .from('bookings')
                .select('payment_method')
                .not('payment_method', 'is', null)
                .in('status', ['paid', 'attended', 'reserved'])
                .in('event_id', scopedEventIds),
      ])

      if (!active) return
      const revenue = (revRows.data ?? []).reduce(
        (sum, r) => sum + (r.total_xof ?? 0),
        0,
      )
      setStats({
        bookingsTotal: bkAll.count ?? 0,
        bookingsToday: bkToday.count ?? 0,
        paid: paid.count ?? 0,
        pending: pending.count ?? 0,
        attended: attended.count ?? 0,
        cancelled: cancelled.count ?? 0,
        revenueXof: revenue,
        scanners: sc.count ?? 0,
        events: ev.count ?? 0,
      })
      setRecent((recentRows.data ?? []) as unknown as RecentBooking[])
      const counts = new Map<string, number>()
      ;(payRows.data ?? []).forEach((r) => {
        const k = r.payment_method ?? 'unknown'
        counts.set(k, (counts.get(k) ?? 0) + 1)
      })
      setPayments(
        Array.from(counts.entries())
          .map(([method, count]) => ({ method, count }))
          .sort((a, b) => b.count - a.count),
      )
    }

    void load()
    return () => {
      active = false
    }
  }, [user, isOrganizer])

  const total =
    stats?.bookingsTotal && stats.bookingsTotal > 0 ? stats.bookingsTotal : 1
  const avgBasket = stats ? Math.round(stats.revenueXof / total) : 0
  const paymentTotal = payments.reduce((s, p) => s + p.count, 0) || 1

  const now = new Date()
  const upcoming = myEvents.filter((e) => new Date(e.starts_at) >= now)
  const past = myEvents.filter((e) => new Date(e.starts_at) < now)

  if (!stats) return <AdminContentLoadingWire />

  return (
    <div className="admin-page">
      <div className="admin-hero">
        <h1 className="admin-h1">
          {isOrganizer ? 'Vue prestataire' : "Vue d'ensemble"}
        </h1>
        <p className="admin-hero-sub">
          {isOrganizer
            ? 'Accès prestataire'
            : 'Gestion de la plateforme'}{' '}
          pour {user?.email}.
        </p>
      </div>

      <section className="admin-kpis">
        <article className="admin-card">
          <p className="admin-card-label">Réservations</p>
          <p className="admin-card-value">{stats?.bookingsTotal ?? '…'}</p>
          <p className="admin-card-meta">
            {stats?.bookingsToday ?? 0} aujourd'hui
          </p>
        </article>
        <article className="admin-card">
          <p className="admin-card-label">Chiffre d'affaires</p>
          <p className="admin-card-value">
            {stats ? formatXof(stats.revenueXof) : '…'}
          </p>
          <p className="admin-card-meta">
            Panier moyen : {stats ? formatXof(avgBasket) : '—'}
          </p>
        </article>
        <article className="admin-card">
          <p className="admin-card-label">Tickets actifs</p>
          <p className="admin-card-value">
            {stats ? stats.paid + stats.attended : '…'}
          </p>
          <p className="admin-card-meta">
            Payés : {stats?.paid ?? 0} · Entrés : {stats?.attended ?? 0} · Annulés :{' '}
            {stats?.cancelled ?? 0}
          </p>
        </article>
      </section>

      <section className="admin-grid-2">
        <article className="admin-card admin-card--lg">
          <h2 className="admin-card-title">Paiements</h2>
          {payments.length === 0 ? (
            <p className="admin-card-empty">Aucune donnée.</p>
          ) : (
            <ul className="admin-bars">
              {payments.map((p) => {
                const pct = Math.round((p.count / paymentTotal) * 100)
                return (
                  <li key={p.method ?? 'unknown'}>
                    <div className="admin-bar-row">
                      <span className="admin-bar-label">
                        {METHOD_LABELS[p.method ?? ''] ?? p.method ?? '—'}
                      </span>
                      <span className="admin-bar-value">
                        {p.count} · {pct}%
                      </span>
                    </div>
                    <div className="admin-bar-track">
                      <div
                        className="admin-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </article>
        <article className="admin-card admin-card--lg">
          <h2 className="admin-card-title">Dernières réservations</h2>
          {recent.length === 0 ? (
            <p className="admin-card-empty">Aucune réservation.</p>
          ) : (
            <ul className="admin-recent">
              {recent.map((r) => (
                <li key={r.id}>
                  <div className="admin-recent-main">
                    <span className="admin-recent-title">
                      {r.events?.title ?? 'Restaurant'}
                    </span>
                    <span className="admin-recent-meta">
                      Table {r.tables?.label ?? '—'} ·{' '}
                      <span className={`badge badge--${r.status}`}>{r.status}</span>
                    </span>
                  </div>
                  <strong>{formatXof(r.total_xof)}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {isOrganizer && (
        <section className="admin-card admin-card--lg" style={{ marginBottom: '1.5rem' }}>
          <h2 className="admin-card-title">Mes événements</h2>
          {myEvents.length === 0 ? (
            <p className="admin-card-empty">
              Aucun événement rattaché à votre compte.{' '}
              <Link to="/admin/events/new" className="admin-link">
                Créer une soirée →
              </Link>
            </p>
          ) : (
            <>
              {upcoming.length > 0 ? (
                <>
                  <p className="admin-section-sub">
                    À venir ({upcoming.length})
                  </p>
                  <ul className="admin-recent">
                    {upcoming.slice(0, 8).map((e) => (
                      <li key={e.id}>
                        <div className="admin-recent-main">
                          <Link
                            to={`/admin/events/${e.id}`}
                            className="admin-recent-title"
                          >
                            {e.title}
                          </Link>
                          <span className="admin-recent-meta">
                            {formatDateTimeFr(e.starts_at)}
                          </span>
                        </div>
                        <span className={`badge badge--${e.status}`}>{e.status}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="admin-card-empty">Aucun événement à venir.</p>
              )}
              {past.length > 0 && (
                <details className="admin-archive">
                  <summary>Archives ({past.length})</summary>
                  <ul className="admin-recent">
                    {past.slice(0, 24).map((e) => (
                      <li key={e.id}>
                        <div className="admin-recent-main">
                          <span className="admin-recent-title admin-recent-title--past">
                            {e.title}
                          </span>
                          <span className="admin-recent-meta">
                            {formatDateTimeFr(e.starts_at)}
                          </span>
                        </div>
                        <span className="badge badge--past">Passé</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>
      )}

      <section>
        <h2 className="admin-h2">Accès rapides</h2>
        <div className="admin-shortcuts">
          <Link to="/admin/events/new" className="admin-shortcut">
            <strong>Nouvelle soirée</strong>
            <p>Créer un événement avec poster, date, prix de base.</p>
            <span className="admin-shortcut-arrow">Ouvrir →</span>
          </Link>
          <Link to="/admin/bookings" className="admin-shortcut">
            <strong>Réservations à confirmer</strong>
            <p>{stats?.pending ?? 0} en attente · paiements sur place.</p>
            <span className="admin-shortcut-arrow">Ouvrir →</span>
          </Link>
          <Link to="/admin/scanners" className="admin-shortcut">
            <strong>Comptes scanner</strong>
            <p>{stats?.scanners ?? 0} scanners actifs.</p>
            <span className="admin-shortcut-arrow">Ouvrir →</span>
          </Link>
          {!isOrganizer && (
            <Link to="/admin/menu" className="admin-shortcut">
              <strong>Menu boissons</strong>
              <p>Ajouter ou désactiver des bouteilles, cocktails…</p>
              <span className="admin-shortcut-arrow">Ouvrir →</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
