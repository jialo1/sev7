import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function RestaurantHome() {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [partySize, setPartySize] = useState(2)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    const params = new URLSearchParams({ date, party: String(partySize) })
    navigate(`/restaurant/seats?${params.toString()}`)
  }

  return (
    <main className="resto-home">
      <header className="page-head">
        <h1>Restaurant SEV7</h1>
        <Link to="/" className="back-link">← Accueil</Link>
      </header>
      <form onSubmit={handleSubmit} className="resto-form">
        <label>
          Date et heure
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label>
          Nombre de personnes
          <input
            type="number"
            min={1}
            max={12}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            required
          />
        </label>
        <button type="submit" className="btn-primary">
          Voir le plan de salle
        </button>
        <Link to="/restaurant/menu" className="btn-outline">
          Voir le menu
        </Link>
      </form>
    </main>
  )
}
