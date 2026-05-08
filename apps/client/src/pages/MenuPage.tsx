import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatXof } from '@sev7/shared'
import { useCart } from '../store/cart'
import type { MenuItem } from '@sev7/shared'

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
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [items, setItems] = useState<DbItem[]>([])
  const [loading, setLoading] = useState(true)

  const lines = useCart((s) => s.lines)
  const add = useCart((s) => s.add)
  const total = useCart((s) => s.totalXof())

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('venues').select('id').eq('slug', venueSlug).maybeSingle(),
    ]).then(async ([{ data: venue }]) => {
      if (!venue) {
        if (active) setLoading(false)
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
      if (!active) return
      setCategories((cats ?? []) as DbCategory[])
      setItems((its ?? []) as DbItem[])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [venueSlug])

  const grouped = useMemo(() => {
    return categories.map((c) => ({
      category: c,
      items: items.filter((i) => i.category_id === c.id),
    }))
  }, [categories, items])

  return (
    <main className="menu-page">
      <header className="page-head">
        <h1>Menu</h1>
        <Link to="/" className="back-link">← Accueil</Link>
      </header>
      {loading && <p>Chargement…</p>}
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
              return (
                <li key={it.id}>
                  <div>
                    <h3>{it.name}</h3>
                    {it.description && <p>{it.description}</p>}
                    <span>{formatXof(it.price_xof)}</span>
                  </div>
                  <button type="button" onClick={() => add(menuItem)}>
                    Ajouter
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {lines.length > 0 && (
        <div className="cart-bar">
          <span>{lines.reduce((s, l) => s + l.qty, 0)} articles</span>
          <strong>{formatXof(total)}</strong>
          <Link to="/orders/new" className="btn-primary">Valider</Link>
        </div>
      )}
    </main>
  )
}
