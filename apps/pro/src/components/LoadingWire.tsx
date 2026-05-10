type WireProps = { className?: string }

export function Wire({ className = '' }: WireProps) {
  return <div className={`sev7-skeleton-line ${className}`} aria-hidden />
}

export function AdminContentLoadingWire() {
  return (
    <div className="admin-page">
      <div className="admin-hero">
        <Wire className="wire-h1" />
        <Wire className="wire-sub" />
      </div>

      <div className="admin-kpis">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="admin-card">
            <Wire className="wire-label" />
            <Wire className="wire-value" />
            <Wire className="wire-meta" />
          </div>
        ))}
      </div>

      <div className="admin-grid-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="admin-card admin-card--lg">
            <Wire className="wire-title" />
            <div className="wire-stack">
              {Array.from({ length: 4 }).map((__, j) => (
                <Wire key={j} className="wire-row" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
