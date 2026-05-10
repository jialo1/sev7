/**
 * CORS verrouillé pour SEV7.
 *
 * Stratégie : on enforce la whitelist d'Origin sur la PREFLIGHT (OPTIONS).
 * Sur les réponses concrètes on renvoie un wildcard parce que le client
 * Supabase n'utilise pas `credentials: include` (auth via Bearer header,
 * pas via cookie). Le navigateur cache la preflight ; un Origin non
 * autorisé est bloqué AVANT que la requête réelle ne parte.
 *
 * Webhooks server-to-server (CinetPay) : pas d'Origin → autorisés. La
 * sécurité dépend du HMAC sur payload+headers, pas du CORS.
 */
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const WEBHOOK_BYPASS = new Set(['payments-webhook'])

function functionName(req: Request): string {
  const path = new URL(req.url).pathname
  const idx = path.lastIndexOf('/')
  return idx >= 0 ? path.slice(idx + 1) : ''
}

function isOriginAllowed(req: Request): boolean {
  const fn = functionName(req)
  if (WEBHOOK_BYPASS.has(fn)) return true
  const origin = req.headers.get('origin')
  // Pas d'origin (server-to-server, curl, supabase functions invoke avec admin key) : ok.
  if (!origin) return true
  // Pas d'allowlist (dev local) : tout passe.
  if (ALLOWED.length === 0) return true
  return ALLOWED.includes(origin)
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
}

export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null
  if (!isOriginAllowed(req)) {
    return new Response('forbidden', { status: 403 })
  }
  // Echo de l'Origin sur la preflight pour respecter Vary + caches CDN.
  const origin = req.headers.get('origin')
  return new Response('ok', {
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin ?? '*',
    },
  })
}

/**
 * Bloque les requêtes non-preflight depuis une Origin interdite. À appeler
 * en début de handler avant tout traitement (après preflight).
 */
export function originGuard(req: Request): Response | null {
  if (!isOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: 'forbidden_origin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  return null
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}
