import { Link } from 'react-router-dom'

export function AdminTablesEditorPage() {
  return (
    <div className="admin-page">
      <h1 className="admin-h1">Plan de salle</h1>
      <div
        style={{
          padding: '2rem',
          background: 'var(--surface)',
          border: '1px dashed var(--line)',
          borderRadius: 'var(--radius)',
          textAlign: 'center',
          color: 'var(--text-dim)',
        }}
      >
        <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          🛠️ Éditeur visuel — Phase B
        </p>
        <p style={{ fontSize: '0.9rem' }}>
          L'édition graphique du plan de salle (drag des tables, prix,
          capacités) arrive prochainement. Pour l'instant, modifie les tables
          directement en SQL via Supabase Studio.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/admin" className="admin-link">
            ← Retour
          </Link>
        </p>
      </div>
    </div>
  )
}
