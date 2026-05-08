import type { ClubTable } from '@sev7/shared'

type Props = {
  tables: ClubTable[]
  selectedId: string | null
  freeSeats: number
  roomLabel: string
  onSelect: (id: string) => void
  viewBox?: string
  decor?: 'club' | 'restaurant' | 'none'
}

export function FloorPlan({
  tables,
  selectedId,
  freeSeats,
  roomLabel,
  onSelect,
  viewBox = '0 0 900 520',
  decor = 'club',
}: Props) {
  const dark = decor === 'club'
  const gid = `floor-grad-${decor}`
  const fid = `floor-soft-${decor}`

  return (
    <section className="map-panel" aria-label="Plan de la salle">
      <header className="map-head">
        <div className="map-head-row">
          <span className="room-badge">{roomLabel}</span>
          <span className="a11y-dot" title="Établissement avec accès PMR">
            ♿
          </span>
        </div>
        <div className="map-head-center">
          <span className="map-kicker">Plan interactif</span>
          <h2 className="map-title">Sélectionnez votre table</h2>
          <p className="map-sub">
            <strong>{freeSeats}</strong> places encore réservables sur ce plan
          </p>
        </div>
      </header>

      <div className="svg-wrap">
        <svg
          viewBox={viewBox}
          className="floor-svg"
          data-decor={decor}
          role="img"
          aria-label="Plan interactif des tables"
        >
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              {dark ? (
                <>
                  <stop offset="0%" stopColor="#161210" />
                  <stop offset="100%" stopColor="#0c0a08" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#f8f7f4" />
                  <stop offset="100%" stopColor="#ebe8e0" />
                </>
              )}
            </linearGradient>
            <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy={dark ? 2 : 1}
                stdDeviation={dark ? 2.5 : 1.5}
                floodOpacity={dark ? 0.35 : 0.12}
              />
            </filter>
          </defs>

          <rect
            width="900"
            height="520"
            fill={`url(#${gid})`}
            rx={dark ? 16 : 12}
          />
          <rect
            x="24"
            y="24"
            width="852"
            height="472"
            rx={dark ? 12 : 8}
            fill={dark ? '#1a1612' : '#faf9f6'}
            stroke={dark ? 'rgba(244, 163, 64, 0.14)' : 'none'}
            strokeWidth="1"
          />

          {decor === 'club' && (
            <>
              <rect x="708" y="128" width="140" height="44" rx="8" fill="#080706" />
              <text
                x="778"
                y="156"
                textAnchor="middle"
                fill="#d4a857"
                fontSize="13"
                fontWeight="600"
              >
                BAR
              </text>

              <ellipse
                cx="450"
                cy="255"
                rx="158"
                ry="88"
                fill="rgba(244, 163, 64, 0.07)"
                stroke="rgba(244, 163, 64, 0.22)"
                strokeWidth="1.5"
              />
              <text
                x="450"
                y="262"
                textAnchor="middle"
                fill="#9a8260"
                fontSize="14"
                fontWeight="600"
                letterSpacing="2"
              >
                PISTE
              </text>
            </>
          )}

          {tables.map((t) => {
            const isBooked = t.status === 'booked'
            const isPending = t.status === 'pending'
            const isLocked = isBooked || isPending
            const isSelected = t.id === selectedId

            let fill: string
            let stroke: string
            if (dark) {
              fill = isBooked
                ? '#2a2620'
                : isPending
                  ? 'rgba(244, 163, 64, 0.14)'
                  : isSelected
                    ? 'rgba(244, 163, 64, 0.3)'
                    : 'rgba(255, 255, 255, 0.05)'
              stroke = isBooked
                ? '#3d3830'
                : isPending
                  ? '#c9782a'
                  : isSelected
                    ? '#f4c978'
                    : 'rgba(244, 163, 64, 0.5)'
            } else {
              fill = isBooked
                ? '#c8c4bc'
                : isPending
                  ? '#f3e6c7'
                  : isSelected
                    ? '#cfe4f2'
                    : 'rgba(255,255,255,0.35)'
              stroke = isBooked
                ? '#a8a29a'
                : isPending
                  ? '#c9a227'
                  : isSelected
                    ? '#2b6cb0'
                    : '#c9a227'
            }

            const cursor = isLocked ? 'not-allowed' : 'pointer'
            const ariaState = isBooked
              ? 'indisponible'
              : isPending
                ? 'en cours de réservation'
                : 'disponible'

            const labelFill = dark
              ? isLocked
                ? '#6b6560'
                : '#f2ebe0'
              : isLocked
                ? '#5c5852'
                : '#1a1814'
            const subFill = dark
              ? isLocked
                ? '#857b70'
                : '#b5aa9a'
              : isLocked
                ? '#6f6a62'
                : '#4a453c'
            const vipFill = dark ? '#f4a340' : '#9a6b2f'

            return (
              <g key={t.id}>
                <rect
                  x={t.x}
                  y={t.y}
                  width={t.w}
                  height={t.h}
                  rx={t.rx}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={t.variant === 'vip' ? 2.5 : 1.8}
                  strokeDasharray={isPending ? '4 3' : undefined}
                  filter={`url(#${fid})`}
                  cursor={cursor}
                  onClick={() => {
                    if (!isLocked) onSelect(t.id)
                  }}
                  onKeyDown={(e) => {
                    if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onSelect(t.id)
                    }
                  }}
                  tabIndex={isLocked ? -1 : 0}
                  role="button"
                  aria-disabled={isLocked}
                  aria-pressed={isSelected}
                  aria-label={`Table ${t.label}, ${t.capacity} places, ${ariaState}`}
                />
                <text
                  x={t.x + t.w / 2}
                  y={t.y + t.h / 2 - 5}
                  textAnchor="middle"
                  fill={labelFill}
                  fontSize="13"
                  fontWeight="700"
                  pointerEvents="none"
                >
                  {t.label}
                </text>
                <text
                  x={t.x + t.w / 2}
                  y={t.y + t.h / 2 + 11}
                  textAnchor="middle"
                  fill={subFill}
                  fontSize="11"
                  pointerEvents="none"
                >
                  {t.capacity} pers.
                </text>
                {t.variant === 'vip' && !isLocked && (
                  <text
                    x={t.x + t.w / 2}
                    y={t.y - 6}
                    textAnchor="middle"
                    fill={vipFill}
                    fontSize="10"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    VIP
                  </text>
                )}
              </g>
            )
          })}

          {decor === 'club' && (
            <>
              <path
                d="M 180 458 Q 450 420 720 458 L 700 498 Q 450 468 200 498 Z"
                fill="#0f0d0b"
                stroke="rgba(212, 168, 87, 0.55)"
                strokeWidth="1.5"
              />
              <text
                x="450"
                y="482"
                textAnchor="middle"
                fill="#c9a050"
                fontSize="14"
                fontWeight="600"
                letterSpacing="3"
              >
                SCÈNE · DJ
              </text>
            </>
          )}
        </svg>

        <div className="legend">
          <span className="leg-item">
            <i className="swatch free" /> Disponible
          </span>
          <span className="leg-item">
            <i className="swatch pending" /> En cours
          </span>
          <span className="leg-item">
            <i className="swatch taken" /> Pris
          </span>
          <span className="leg-item">
            <i className="swatch sel" /> Votre choix
          </span>
        </div>
      </div>
    </section>
  )
}
