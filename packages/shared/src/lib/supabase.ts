import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type SupabaseClientLike = SupabaseClient

let client: SupabaseClient | null = null

/**
 * Singleton du client Supabase. Chaque app monorepo l'initialise au boot
 * en lui passant ses VITE_SUPABASE_URL/ANON_KEY. Le premier appel verrouille
 * l'instance pour toute la session, les appels suivants retournent la même.
 */
export function getSupabase(url: string, anonKey: string): SupabaseClient {
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

/**
 * Récupère le client déjà initialisé (à appeler une fois `getSupabase` invoqué
 * dans le main.tsx de l'app). Lance si non-initialisé.
 */
export function getClient(): SupabaseClient {
  if (!client) {
    throw new Error(
      '[@sev7/shared] Supabase non initialisé. Appelle getSupabase(url, key) au boot de l\'app.',
    )
  }
  return client
}
