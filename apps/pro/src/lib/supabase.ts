import { getSupabase } from '@sev7/shared'

const url = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'public-anon-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[@sev7/pro] Variables Supabase manquantes : copie .env.example en .env.local.',
  )
}

export const supabase = getSupabase(url, anonKey)
