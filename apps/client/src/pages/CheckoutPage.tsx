import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateTimeFr, formatXof } from '@sev7/shared'
import { CoverImage } from '@sev7/shared'
import type { PaymentMethod } from '@sev7/shared'

type BookingSummary = {
  id: string
  total_xof: number
  party_size: number
  starts_at: string
  events: { title: string; poster_url: string | null } | null
  tables: { label: string; zone: string; capacity: number } | null
  venues: { name: string; city: string } | null
}

const METHODS: { id: PaymentMethod; label: string; description: string }[] = [
  { id: 'cinetpay_wave', label: 'Wave', description: 'Mobile money — instantané' },
  { id: 'cinetpay_om', label: 'Orange Money', description: 'Mobile money' },
  { id: 'cinetpay_cb', label: 'Carte bancaire', description: 'Visa / Mastercard' },
  { id: 'on_site', label: 'Sur place', description: 'À régler à l\'entrée' },
]

const SERVICE_RATE = 0.08

export function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()

  const [booking, setBooking] = useState<BookingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<PaymentMethod>('cinetpay_wave')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) return
    let active = true
    supabase
      .from('bookings')
      .select(
        'id, total_xof, party_size, starts_at, events(title, poster_url), tables(label, zone, capacity), venues(name, city)',
      )
      .eq('id', bookingId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setBooking((data as unknown as BookingSummary) ?? null)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [bookingId])

  const fees = useMemo(
    () => Math.round((booking?.total_xof ?? 0) * SERVICE_RATE),
    [booking],
  )
  const total = (booking?.total_xof ?? 0) + fees

  async function pay() {
    if (!bookingId) return
    setBusy(true)
    setError(null)
    try {
      if (method === 'on_site') {
        const { error: fnErr } = await supabase.functions.invoke('confirm-onsite', {
          body: { booking_id: bookingId },
        })
        if (fnErr) {
          setError(fnErr.message)
          return
        }
        navigate('/tickets')
        return
      }
      const { data, error: fnErr } = await supabase.functions.invoke<{
        payment_url: string
      }>('payments-init', {
        body: { booking_id: bookingId, method },
      })
      if (fnErr || !data?.payment_url) {
        setError(fnErr?.message ?? 'Impossible de lancer le paiement')
        return
      }
      window.location.href = data.payment_url
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="page-loading">Chargement…</p>
  if (!booking)
    return (
      <main className="checkout-page">
        <p className="empty">Réservation introuvable.</p>
      </main>
    )

  return (
    <>
      <main className="checkout-page">
        <header className="page-head">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1>Réservation</h1>
          <button type="button" className="icon-btn" aria-label="Aide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.5 9a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17h.01" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="summary-card">
          <div className="summary-card-thumb">
            <CoverImage
              src={booking.events?.poster_url ?? null}
              seed={booking.id}
            />
          </div>
          <div>
            <h3>{booking.events?.title ?? 'Réservation'}</h3>
            <p>{booking.venues?.name} · {booking.venues?.city}</p>
          </div>
        </div>

        <p className="section-title">Récapitulatif</p>
        <div className="kv-card">
          <div className="kv-row">
            <span className="kv-label">Date</span>
            <span className="kv-value">{formatDateTimeFr(booking.starts_at)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Table</span>
            <span className="kv-value">
              {booking.tables?.label} · {booking.tables?.zone}
            </span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Personnes</span>
            <span className="kv-value">
              {booking.party_size} / {booking.tables?.capacity}
            </span>
          </div>
        </div>

        <p className="section-title">Mode de paiement</p>
        <ul className="payment-methods">
          {METHODS.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setMethod(m.id)}
                aria-pressed={method === m.id}
              >
                <span className="pm-label">{m.label}</span>
                <span className="pm-desc">{m.description}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="section-title">Montant</p>
        <div className="kv-card">
          <div className="kv-row">
            <span className="kv-label">Sous-total</span>
            <span className="kv-value">{formatXof(booking.total_xof)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Frais de service ({Math.round(SERVICE_RATE * 100)} %)</span>
            <span className="kv-value">{formatXof(fees)}</span>
          </div>
          <div className="kv-row kv-row--total">
            <span className="kv-label">Total</span>
            <span className="kv-value">{formatXof(total)}</span>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
      </main>

      <div className="checkout-foot">
        <div className="checkout-foot-inner">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={pay}
          >
            {busy ? 'En cours…' : `Payer ${formatXof(total)}`}
          </button>
        </div>
      </div>
    </>
  )
}
