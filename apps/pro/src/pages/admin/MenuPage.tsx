import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatXof } from '@sev7/shared'

type Venue = { id: string; name: string }
type Category = { id: string; venue_id: string; name: string; sort: number }
type Item = {
  id: string
  category_id: string
  name: string
  description: string | null
  price_xof: number
  available: boolean
}

export function AdminMenuPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [venueId, setVenueId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('venues')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        const list = (data ?? []) as Venue[]
        setVenues(list)
        setVenueId((current) => current ?? list[0]?.id ?? null)
      })
  }, [])

  async function refresh() {
    if (!venueId) return
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('id, venue_id, name, sort')
        .eq('venue_id', venueId)
        .order('sort'),
      supabase
        .from('menu_items')
        .select('id, category_id, name, description, price_xof, available')
        .order('name'),
    ])
    setCategories((cats ?? []) as Category[])
    setItems((its ?? []) as Item[])
  }

  useEffect(() => {
    void Promise.resolve().then(refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId])

  async function addCategory() {
    const name = prompt('Nom de la nouvelle catégorie ?')
    if (!name?.trim() || !venueId) return
    const sort = (categories.at(-1)?.sort ?? 0) + 1
    const { error } = await supabase
      .from('menu_categories')
      .insert({ venue_id: venueId, name: name.trim(), sort })
    if (error) setError(error.message)
    else refresh()
  }

  async function addItem(categoryId: string) {
    const name = prompt('Nom du nouvel item ?')
    if (!name?.trim()) return
    const priceStr = prompt('Prix en XOF ?')
    const price = Number(priceStr)
    if (!Number.isFinite(price) || price < 0) return
    const { error } = await supabase
      .from('menu_items')
      .insert({ category_id: categoryId, name: name.trim(), price_xof: Math.round(price) })
    if (error) setError(error.message)
    else refresh()
  }

  async function toggleAvailable(item: Item) {
    const { error } = await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id)
    if (error) setError(error.message)
    else refresh()
  }

  async function deleteItem(id: string) {
    if (!window.confirm('Supprimer cet item ?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) setError(error.message)
    else refresh()
  }

  async function deleteCategory(id: string) {
    if (!window.confirm('Supprimer la catégorie et tous ses items ?')) return
    const { error } = await supabase.from('menu_categories').delete().eq('id', id)
    if (error) setError(error.message)
    else refresh()
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1 className="admin-h1">Menu</h1>
        <select
          value={venueId ?? ''}
          onChange={(e) => setVenueId(e.target.value)}
          className="admin-input admin-input--inline"
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </header>

      {error && <p className="error">{error}</p>}

      <button type="button" className="btn-outline" onClick={addCategory}>
        + Nouvelle catégorie
      </button>

      <div className="admin-menu-cats">
        {categories.map((c) => (
          <section key={c.id} className="admin-menu-cat">
            <header className="admin-menu-cat-head">
              <h2>{c.name}</h2>
              <div>
                <button type="button" className="admin-link" onClick={() => addItem(c.id)}>
                  + Item
                </button>
                <button
                  type="button"
                  className="admin-link admin-link--danger"
                  onClick={() => deleteCategory(c.id)}
                >
                  Supprimer
                </button>
              </div>
            </header>
            <ul>
              {items
                .filter((it) => it.category_id === c.id)
                .map((it) => (
                  <li key={it.id} className="admin-menu-item">
                    <div>
                      <strong>{it.name}</strong>
                      {it.description && <p>{it.description}</p>}
                    </div>
                    <span>{formatXof(it.price_xof)}</span>
                    <button
                      type="button"
                      className={`admin-link${it.available ? '' : ' admin-link--dim'}`}
                      onClick={() => toggleAvailable(it)}
                    >
                      {it.available ? 'Dispo' : 'Caché'}
                    </button>
                    <button
                      type="button"
                      className="admin-link admin-link--danger"
                      onClick={() => deleteItem(it.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {categories.length === 0 && (
          <p className="empty">Aucune catégorie. Crée la première.</p>
        )}
      </div>
    </div>
  )
}
