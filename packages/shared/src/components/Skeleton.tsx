import type { CSSProperties } from 'react'

type WireProps = {
  className?: string
  style?: CSSProperties
}

/** Skeleton line ambre dark + shimmer (shared client + pro). */
export function Wire({ className = '', style }: WireProps) {
  return (
    <div
      className={`sev7-skeleton-line ${className}`}
      style={style}
      aria-hidden
    />
  )
}

/** Skeleton standardisé pour les listes d'events / tickets / orders. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="list-skeleton" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="list-skeleton-item">
          <Wire className="list-skeleton-thumb" />
          <div className="list-skeleton-body">
            <Wire className="list-skeleton-title" />
            <Wire className="list-skeleton-meta" />
            <Wire className="list-skeleton-price" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Skeleton pour la home (1 featured + N cards). */
export function HomeSkeleton() {
  return (
    <div className="home-skeleton" aria-busy="true">
      <Wire className="home-skeleton-featured" />
      <div className="home-skeleton-row">
        {Array.from({ length: 3 }).map((_, i) => (
          <Wire key={i} className="home-skeleton-card" />
        ))}
      </div>
      <Wire className="home-skeleton-section-title" />
      <ListSkeleton count={3} />
    </div>
  )
}
