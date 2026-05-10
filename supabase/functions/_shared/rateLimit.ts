/**
 * Rate-limit fenêtre glissante en mémoire (best-effort, par isolate Deno).
 * Adapté à l'échelle SEV7 (un club + un resto). Pour un cluster multi-régions
 * Edge, prévoir un store Postgres ou Redis dédié.
 */
type Bucket = { count: number; resetAt: number }

function getStore(): Map<string, Bucket> {
  const g = globalThis as typeof globalThis & { __sev7RateLimit?: Map<string, Bucket> }
  if (!g.__sev7RateLimit) g.__sev7RateLimit = new Map()
  return g.__sev7RateLimit
}

export function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const store = getStore()
  const b = store.get(key)
  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (b.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    }
  }
  b.count += 1
  return { ok: true }
}

/** IP du caller (entête forwardée par Supabase Edge Runtime). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export const RATE_LIMITS = {
  /** Création d'un hold de table. */
  createHold: { max: 30, windowMs: 5 * 60_000 },
  /** Initialisation paiement CinetPay. */
  paymentsInit: { max: 20, windowMs: 5 * 60_000 },
  /** Validation QR à l'entrée. */
  ticketsValidate: { max: 600, windowMs: 60_000 },
  /** Création scanner par organizer. */
  organizerCreateScanner: { max: 10, windowMs: 60 * 60_000 },
  /** Toggle scanner (activation / suppression). */
  organizerToggleScanner: { max: 30, windowMs: 60 * 60_000 },
  /** Création user par admin. */
  adminCreateUser: { max: 30, windowMs: 60 * 60_000 },
  /** Reset password admin. */
  adminResetPassword: { max: 30, windowMs: 60 * 60_000 },
  /** Confirmation de réservation sur place. */
  confirmOnsite: { max: 100, windowMs: 60 * 60_000 },
} as const
