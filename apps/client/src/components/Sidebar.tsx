import type { ClubTable, NightEvent } from '@sev7/shared'
import { formatXof } from '@sev7/shared'

type Props = {
  event: NightEvent
  selected: ClubTable | null
  onBack: () => void
  onContinue?: () => void
  onCancel?: () => void
}

export function Sidebar({ event, selected, onBack, onContinue, onCancel }: Props) {
  return (
    <aside className="sidebar" aria-label="Détails de la soirée">
      <div className="sidebar-inner">
        <header className="sidebar-top">
          <button
            type="button"
            className="back-pill"
            onClick={onBack}
            aria-label="Revenir à la soirée"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Retour</span>
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
                <div className="selection-head">
                  <div>
                    <p className="selection-title">Table {selected.label}</p>
                    <p className="selection-meta">
                      {selected.zone} · {selected.capacity} pers. ·{' '}
                      {formatXof(selected.priceXof)}
                    </p>
                  </div>
                  {onCancel && (
                    <button
                      type="button"
                      className="selection-cancel"
                      onClick={onCancel}
                      aria-label="Annuler la sélection"
                      title="Annuler la sélection"
                    >
                      ×
                    </button>
                  )}
                </div>
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
