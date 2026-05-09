import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatXof, useAuth, CoverImage } from '@sev7/shared'
import { useCart } from '../store/cart'
import type { MenuItem } from '@sev7/shared'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

type DbCategory = { id: string; name: string; sort: number }
type DbItem = {
  id: string
  category_id: string
  name: string
  description: string | null
  price_xof: number
  image_url: string | null
  available: boolean
}

export function MenuPage() {
  const [params] = useSearchParams()
  const venueSlug = params.get('venue') ?? 'club'
  const navigate = useNavigate()
  const { user } = useAuth()
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [items, setItems] = useState<DbItem[]>([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const lines = useCart((s) => s.lines)
  const add = useCart((s) => s.add)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const total = useCart((s) => s.totalXof())
  const clear = useCart((s) => s.clear)

  const fetchMenu = useCallback(async () => {
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('slug', venueSlug)
      .maybeSingle()
    if (!venue) {
      setLoading(false)
      return
    }
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('id, name, sort')
        .eq('venue_id', venue.id)
        .order('sort'),
      supabase
        .from('menu_items')
        .select('id, category_id, name, description, price_xof, image_url, available')
        .eq('available', true),
    ])
    setCategories((cats ?? []) as DbCategory[])
    setItems((its ?? []) as DbItem[])
    setLoading(false)
  }, [venueSlug])

  useEffect(() => {
    void Promise.resolve().then(fetchMenu)
  }, [fetchMenu])

  useRealtimeRefresh(['menu_items', 'menu_categories'], fetchMenu)

  const grouped = useMemo(() => {
    return categories.map((c) => ({
      category: c,
      items: items.filter((i) => i.category_id === c.id),
    }))
  }, [categories, items])

  const itemCount = lines.reduce((s, l) => s + l.qty, 0)

  async function placeOrder() {
    if (!user) {
      navigate('/auth/login', { state: { from: '/menu' } })
      return
    }
    setPlacing(true)
    setOrderError(null)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const { data: bookings, error: bkErr } = await supabase
        .from('bookings')
        .select('id, table_id, venue_id')
        .eq('user_id', user.id)
        .in('status', ['paid', 'reserved', 'attended'])
        .gte('starts_at', todayStart.toISOString())
        .lt('starts_at', todayEnd.toISOString())
        .limit(1)
      if (bkErr) throw bkErr
      const booking = bookings?.[0]
      if (!booking) {
        setOrderError(
          'Tu dois avoir une réservation active pour aujourd\'hui pour commander.',
        )
        return
      }

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          booking_id: booking.id,
          table_id: booking.table_id,
          venue_id: booking.venue_id,
          total_xof: total,
          status: 'placed',
        })
        .select('id')
        .single()
      if (orderErr) throw orderErr

      const itemsPayload = lines.map((l) => ({
        order_id: order.id,
        menu_item_id: l.item.id,
        qty: l.qty,
        unit_price_xof: l.item.priceXof,
        note: l.note ?? null,
      }))
      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsPayload)
      if (itemsErr) throw itemsErr

      clear()
      navigate('/orders')
    } catch (e: unknown) {
      setOrderError(
        e instanceof Error ? e.message : 'Erreur lors de la commande',
      )
    } finally {
      setPlacing(false)
    }
  }

  return (
    <main className="menu-page">
      <header className="page-head">
        <Link to="/" className="back-link">← Accueil</Link>
        <h1>Menu</h1>
      </header>
      {loading && <p className="page-loading">Chargement…</p>}
      {grouped.map(({ category, items: list }) => (
        <section key={category.id}>
          <h2>{category.name}</h2>
          <ul className="menu-list">
            {list.map((it) => {
              const menuItem: MenuItem = {
                id: it.id,
                categoryId: it.category_id,
                name: it.name,
                description: it.description,
                priceXof: it.price_xof,
                imageUrl: it.image_url,
                available: it.available,
              }
              const inCart = lines.find((l) => l.item.id === it.id)
              return (
                <li key={it.id}>
                  <div className="menu-item-thumb">
                    <CoverImage src={it.image_url} seed={it.id} />
                  </div>
                  <div className="menu-item-body">
                    <h3>{it.name}</h3>
                    {it.description && <p>{it.description}</p>}
                    <span>{formatXof(it.price_xof)}</span>
                  </div>
                  {inCart ? (
                    <div className="qty-control">
                      <button
                        type="button"
                        aria-label="Retirer un"
                        onClick={() => setQty(it.id, inCart.qty - 1)}
                      >
                        −
                      </button>
                      <span>{inCart.qty}</span>
                      <button
                        type="button"
                        aria-label="Ajouter un"
                        onClick={() => add(menuItem)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => add(menuItem)}>
                      Ajouter
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {orderError && <p className="error">{orderError}</p>}

      {lines.length > 0 && (
        <>
          {cartOpen && (
            <div
              className="cart-backdrop"
              role="presentation"
              onClick={() => setCartOpen(false)}
            />
          )}
          <div className={`cart-drawer${cartOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="cart-summary"
              onClick={() => setCartOpen((o) => !o)}
              aria-expanded={cartOpen}
              aria-label={cartOpen ? 'Fermer le panier' : 'Ouvrir le panier'}
            >
              <span>{itemCount} {itemCount > 1 ? 'articles' : 'article'}</span>
              <strong>{formatXof(total)}</strong>
              <span className="cart-chevron" aria-hidden>
                {cartOpen ? '▾' : '▴'}
              </span>
            </button>
            {cartOpen && (
              <div className="cart-body">
                <ul className="cart-lines">
                  {lines.map((l) => (
                    <li key={l.item.id}>
                      <div className="cart-line-info">
                        <strong>{l.item.name}</strong>
                        <span>{formatXof(l.item.priceXof)} · {l.qty}</span>
                      </div>
                      <div className="qty-control">
                        <button
                          type="button"
                          onClick={() => setQty(l.item.id, l.qty - 1)}
                          aria-label="Retirer un"
                        >
                          −
                        </button>
                        <span>{l.qty}</span>
                        <button
                          type="button"
                          onClick={() => add(l.item)}
                          aria-label="Ajouter un"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-line-remove"
                        onClick={() => remove(l.item.id)}
                        aria-label="Supprimer cet article"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="cart-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => clear()}
                  >
                    Vider le panier
                  </button>
                </div>
              </div>
            )}
            <div className="cart-cta">
              <button
                type="button"
                className="btn-primary"
                disabled={placing}
                onClick={placeOrder}
              >
                {placing ? 'Envoi…' : `Valider ${formatXof(total)}`}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
