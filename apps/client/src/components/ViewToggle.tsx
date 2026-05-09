import type { ViewMode } from '../hooks/useViewMode'

type Props = {
  mode: ViewMode
  onChange: (m: ViewMode) => void
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="view-toggle" role="tablist" aria-label="Mode d'affichage">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'grid'}
        className={mode === 'grid' ? 'active' : ''}
        onClick={() => onChange('grid')}
        title="Vue grille"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'list'}
        className={mode === 'list' ? 'active' : ''}
        onClick={() => onChange('list')}
        title="Vue liste"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
