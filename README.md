# VendorScore (clean frontend) — React + Vite + Supabase

Deze zip is bedoeld als **foutloze basis** die past bij de huidige multi-tenant Supabase-opzet met:

- `organizations` (+ `slug`)
- `org_memberships` (membership per user per org)
- `suppliers` (per org)
- `criteria` (K1..K5 via `section`)
- `evaluations`
- `evaluation_scores` (upsert op `(evaluation_id, criteria_id)`)
- `weight_configs` (unique `(organization_id, strategy, k_block)`)

## 1) Install & run

```bash
npm install
npm run dev
```

## 2) Config (Supabase URL + anon key)

Optie A (aanrader, Vercel + lokaal): `.env` in project-root:

```bash
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

Optie B (runtime config): ga naar `/settings` en plak de URL + key.
Deze worden opgeslagen in **localStorage** onder:

- `VENDORSCORE_SUPABASE_URL`
- `VENDORSCORE_SUPABASE_ANON_KEY`

## 3) Waar maken medewerkers een account aan?

Er zijn 2 routes:

1) **Self-signup in de app** (meest duidelijk voor medewerkers)
- Ga naar `/login` en kies tab **Account**.
- Maak een account aan (email + wachtwoord).
- Als e-mailbevestiging aan staat in Supabase: bevestig eerst via je mailbox.

2) **Admin maakt accounts aan in Supabase**
- Supabase Dashboard → **Authentication → Users**
- Voeg user toe / reset wachtwoord.

> Welke je ook kiest: daarna moet de gebruiker zichzelf **koppelen aan de juiste organisatie** (join via slug).

## 4) Onboarding nieuwe medewerker (join via slug)

Ga naar `/onboarding` in de app voor de stap-voor-stap uitleg.

Korte versie:

1. Admin deelt join-link: `/join/<slug>` (bijv. `/join/gilde`)
2. Medewerker logt in (of maakt eerst een account)
3. Open de join-link → membership wordt aangemaakt/bevestigd in `org_memberships`
4. Ga naar `/org` en selecteer de organisatie (wordt onthouden in localStorage)

## 5) Vercel 404 op /org fix

Deze zip bevat `vercel.json` met SPA rewrites zodat routes zoals `/org` niet 404’en.

## 6) UI

Deze build gebruikt Tailwind (lichte inputs, betere leesbaarheid). Pas globale input-styling aan in `src/index.css`.


## Production config (Vercel)

In production the app is **env-only**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Environment Variables and redeploy. LocalStorage fallback is only enabled in development.
