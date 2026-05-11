# SEV7

PWA de réservation pour le club SEV7 (Dakar) et son restaurant adjacent.
Monorepo npm workspaces : `apps/client` (acheteurs) + `apps/pro` (admin/organizer/staff/scanner) + `packages/shared` + `supabase/`.

## Stack

- Vite 8 + React 19 + TypeScript + React Router v7
- Supabase (Postgres + Auth + Realtime + Edge Functions Deno + Storage)
- CinetPay (Wave / Orange Money / Carte) — fallback mock en dev
- Resend (mail de confirmation de réservation)
- vite-plugin-pwa (client), Vercel (hosting)

## Lancer en dev

```bash
npm install
supabase start                    # Postgres + Auth + Studio + Storage local
supabase migration up             # applique 0001 → 0006
npm run dev                       # client :5173 + pro :5174 en parallèle
```

Variables d'env Vite (à poser dans `apps/client/.env.local` et `apps/pro/.env.local`) :

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
# Pro uniquement, pour le bouton "→ SEV7" qui renvoie au client
VITE_CLIENT_URL=https://app.sev7.app
```

## Edge Functions — variables d'environnement

Configurées via `supabase secrets set <KEY>=<VALUE>` (prod) ou `supabase/.env` (local).

| Variable | Usage | Obligatoire |
|---|---|---|
| `SUPABASE_URL` | injectée par Supabase | auto |
| `SUPABASE_SERVICE_ROLE_KEY` | injectée par Supabase | auto |
| `SUPABASE_ANON_KEY` | injectée par Supabase | auto |
| `ALLOWED_ORIGINS` | CORS verrouillé : liste comma-separated des origins client/pro autorisés (ex. `https://app.sev7.app,https://pro.sev7.app`). Vide → wildcard (dev local). | prod |
| `PUBLIC_APP_URL` | URL retour CinetPay + lien dans les mails (ex. `https://app.sev7.app`) | prod |
| `CINETPAY_API_KEY` | clé CinetPay marchand. Sans clé → mode mock (paiement auto-validé). | prod |
| `CINETPAY_SITE_ID` | id du site CinetPay | prod |
| `RESEND_API_KEY` | API key Resend pour les mails de confirmation. Sans clé → mode mock (mail loggé seulement). | prod |
| `RESEND_FROM_EMAIL` | expéditeur, ex. `SEV7 <reservations@sev7.app>` (domaine vérifié sur Resend). | prod |
| `QR_SIGNING_SECRET` | secret JWT pour signer les QR billets (`tickets-issue` / `tickets-validate`). 32+ caractères aléatoires. | prod |

## Sécurité

- **CORS** verrouillé via `ALLOWED_ORIGINS` (preflight OPTIONS bloque les origins non listées).
- **Rate-limit** in-memory par isolate Edge sur les fonctions sensibles (create-hold, payments-init, tickets-validate, organizer/admin user management). Réponse 429 avec `Retry-After`.
- **Audit log** (`audit_logs`) : toutes les actions admin/organizer/paiement sont tracées. Lecture admin only via RLS.
- **RLS** stricte par rôle (`current_user_role()` helper SECURITY DEFINER pour éviter la récursion).
- **Headers HTTP** posés via `vercel.json` (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors `'none'`).
- **`/admin`** côté pro a `X-Robots-Tag: noindex, nofollow, nocache`.
- **Storage `posters`** : organizer ne peut écrire que sous son préfixe `organizer/{user_id}/...`.

## Déploiement Vercel

Deux projets Vercel séparés (un par app), tous les deux pointant sur le même repo. La pièce **critique** est la **Root Directory** côté Vercel : si elle est mauvaise, le bundle est introuvable et la page est blanche.

### Étapes pour chaque projet

1. **New Project** → import du repo GitHub `SEV7`.
2. **Configure Project** :
   - **Framework Preset** : Vite (auto-détecté)
   - **Root Directory** : `apps/client` pour le projet acheteur, `apps/pro` pour le projet pro
   - Build/Output : laisse Vercel les piocher dans `apps/<name>/vercel.json` (déjà configurés : `npm run build` + `dist`)
3. **Environment Variables** (Production + Preview) :
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<anon-key>`
   - Pour le projet pro uniquement : `VITE_CLIENT_URL` = `https://app.sev7.app`
4. **Deploy**.

| Projet | Root Directory | Domaine prod |
|---|---|---|
| sev7-client | `apps/client` | `app.sev7.app` |
| sev7-pro | `apps/pro` | `pro.sev7.app` |

Les `vercel.json` portent les headers de sécurité (CSP, HSTS, Permissions-Policy, X-Robots-Tag noindex sur le pro), le rewrite SPA `(.*) → /index.html` et le caching `immutable` sur `/assets/*`. Vercel détecte automatiquement npm workspaces : il installe les deps depuis le monorepo root, puis exécute le build dans le Root Directory.

### Page blanche au déploiement — checklist

- [ ] Root Directory bien posée à `apps/client` ou `apps/pro` (pas le repo root)
- [ ] `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` posées dans Vercel Settings → Environment Variables
- [ ] Vérifier dans Deployments → Build Logs qu'il n'y a pas d'erreur `Module not found` (auquel cas l'install des workspaces a foiré)
- [ ] Onglet Functions / Static doit montrer `index.html` + `assets/index-*.js` + `assets/index-*.css`
- [ ] Console navigateur : si CSP bloque un asset, ajouter le domaine dans `vercel.json`

## CI

`.github/workflows/ci.yml` lance `npm ci` + lint + typecheck + build sur PR et push main. `dependabot.yml` ouvre des PRs hebdo (groupées par lib).

## Icônes PNG (PWA install iOS / Android)

Les favicons sont en SVG (`apps/{client,pro}/public/favicon.svg` + `apple-touch-icon.svg`). Pour générer les variantes PNG nécessaires à l'install homescreen iOS Safari :

```
npm run icons:gen
```

Le script détecte automatiquement l'outil disponible (rsvg-convert, ImageMagick, ou `npx @resvg/resvg-js-cli` en fallback portable). Génère :

- `favicon-32.png`, `favicon-48.png` (onglets)
- `apple-touch-icon.png` (iOS, 180×180)
- `icon-192.png`, `icon-512.png` (Android / Chrome PWA install)

Une fois générés, commit-les et ajoute les entrées dans `manifest.icons` du `vite.config.ts` (déjà documenté dans le script).

## Migrations

Les migrations vivent dans `supabase/migrations/000X_*.sql`. Pour appliquer en prod :

```bash
supabase link --project-ref <ref>
supabase db push
```

Ou via le dashboard Supabase si on préfère piloter manuellement.

## Rôles

| Rôle | Accès |
|---|---|
| `customer` | client app uniquement |
| `scanner` | pro `/scan` |
| `organizer` | pro `/admin` (vue scoped sur ses events + ses scanners enfants) |
| `staff` | pro `/staff/dashboard` + `/scan` |
| `admin` | pro entièrement |
