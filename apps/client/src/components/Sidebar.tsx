import type { ClubTable, NightEvent } from '@sev7/shared'
import { formatXof } from '@sev7/shared'

type Props = {
  event: NightEvent
  selected: ClubTable | null
  onBack: () => void
  onContinue?: () => void
}

export function Sidebar({ event, selected, onBack, onContinue }: Props) {
  return (
    <aside className="sidebar" aria-label="Détails de la soirée">
      <div className="sidebar-inner">
        <header className="sidebar-top">
          <button type="button" className="icon-btn" aria-label="Accueil">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"
              />
            </svg>
          </button>
          <span className="logo-mark">{event.venueName}</span>
        </header>

        <div className="sidebar-body">
          <div className="poster" aria-hidden />
          <div className="event-badges">
            <span className="pill pill--venue">{event.city}</span>
            <span className="pill pill--muted">Réservation table</span>
          </div>
          <h1 className="event-title">{event.title}</h1>
          <p className="event-venue">
            {event.venueName} · {event.city}
          </p>
          {event.startsAt ? (
            <time
              className="event-datetime"
              dateTime={event.startsAt}
            >
              {event.dateLabel}
            </time>
          ) : (
            <p className="event-datetime">{event.dateLabel}</p>
          )}
          <button type="button" className="btn-outline" onClick={onBack}>
            Changer de soirée
          </button>
        </div>

        <footer className="sidebar-foot">
          <button type="button" className="summary-row">
            <span className="summary-label">Établissement</span>
            <span className="summary-val">
              {event.venueName} · {event.city}
            </span>
          </button>
          <button type="button" className="summary-row">
            <span className="summary-label">Date</span>
            <span className="summary-val">{event.dateLabel}</span>
          </button>
          <div className="selection-box">
            {selected ? (
              <>
                <p className="selection-title">Table {selected.label}</p>
                <p className="selection-meta">
                  {selected.zone} · {selected.capacity} pers. ·{' '}
                  {formatXof(selected.priceXof)}
                </p>
              </>
            ) : (
              <p className="selection-empty">Aucune table sélectionnée</p>
            )}
            <button
              type="button"
              className="btn-primary"
              disabled={!selected}
              onClick={onContinue}
            >
              Continuer
            </button>
          </div>
        </footer>
      </div>
    </aside>
  )
}
