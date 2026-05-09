import { useEffect, useState } from 'react'

export type ViewMode = 'grid' | 'list'

/**
 * Persiste un mode d'affichage (grille / liste) en localStorage par clé.
 */
export function useViewMode(storageKey: string, defaultMode: ViewMode = 'grid') {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return defaultMode
    const v = window.localStorage.getItem(storageKey)
    return v === 'grid' || v === 'list' ? v : defaultMode
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, mode)
    } catch {
      /* ignore */
    }
  }, [mode, storageKey])
  return [mode, setMode] as const
}
