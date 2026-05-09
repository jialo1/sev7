import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Souscrit au realtime postgres_changes sur une ou plusieurs tables et appelle
 * `refresh` à chaque changement. Idéal pour propager les modifs admin
 * (events, menu_items, etc.) sur les pages client sans reload manuel.
 */
export function useRealtimeRefresh(
  tables: string[],
  refresh: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || tables.length === 0) return
    const channel = supabase.channel(`refresh:${tables.join(',')}`)
    for (const t of tables) {
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: t },
        () => refresh(),
      )
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join('|'), enabled])
}
