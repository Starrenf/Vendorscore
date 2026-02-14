# VendorScore — React + Vite + Supabase

Versie: v0.5.18 (hotfix: save org guard + KVK sanitizing)

## Windows snelstart

**PowerShell** (aanbevolen):
1) Open de map van het project (waar `package.json` staat)
2) Voer uit:

```powershell
# installeer dependencies
npm install

# starten (dev)
npm run dev

# build (voor Vercel)
npm run build
```

> Gebruik **geen** `npm ci || npm install` in PowerShell — `||` werkt daar niet als statement-separator.

Je kunt ook de meegeleverde scripts gebruiken:
- `tools\windows-dev.ps1` of `tools\windows-dev.cmd`
- `tools\windows-build.ps1` of `tools\windows-build.cmd`

---

Deze zip past bij de huidige multi-tenant Supabase-opzet met:

- `organizations` (+ `slug`, `display_name`, `is_public`, `join_code`)
- `profiles` (incl. `organization_id` en `is_admin`)
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


## Admin organisaties

- Ga naar **/admin/orgs** om organisaties te beheren.
- Zorg dat je profiel `profiles.is_admin = true` is.
- Als de Admin UI geen organisaties kan laden, run dan `supabase/sql_patch_admin_select.sql` in Supabase SQL Editor om admin-select toe te staan.

## v0.5.16 — auth session stabilisatie (refresh-token issues)

In v0.5.16 is de Supabase client verder gestabiliseerd om refresh-token race conditions en "Invalid Refresh Token" issues te verminderen:

- Supabase client gebruikt een vaste `storageKey` (`vendorscore-auth`) en expliciete `localStorage`.
- Bij `TOKEN_REFRESH_FAILED` wordt sessie + org selectie opgeschoond zodat gebruikers opnieuw kunnen inloggen i.p.v. in een "half ingelogde" state te blijven.

## v0.5.14 — frontend fix: geen organization_id filter op RLS queries

In v0.5.14 gebruikt de app RLS als bron van waarheid en voegt geen extra organization_id-filters meer toe bij het ophalen van suppliers/contactpersonen/beoordelingen/wegingen. Dit voorkomt 500 errors bij (nieuwe) gebruikers direct na het koppelen aan een organisatie.

## v0.5.13 — stack depth fix voor nieuwe gebruikers

In v0.5.13 herstelt de app de organisatie-selectie **alleen** vanuit `profiles.organization_id` (en niet meer blind vanuit localStorage). Dit voorkomt dat nieuwe gebruikers met een lege/andere profiel-koppeling toch een org in de UI zien, wat in sommige Supabase/RLS-configuraties kan leiden tot server errors.

Als je in de console/server ooit nog `stack depth limit exceeded` ziet bij org/supplier queries, run dan (optioneel) `supabase/sql_patch_stackdepth_safe_current_org.sql` om de helper-functies `current_org_id()` en `is_admin()` extra veilig te maken.


## Windows (PowerShell) quick start

1) Open this folder in VS Code.
2) Open **Terminal** and make sure you are in the project folder (you should see `package.json` in the Explorer).

```powershell
cd "C:\Users\Frank\Documents\VSCode\Vendorscore\VendorScore_v0.5.18_SaveOrgGuard_KvkSanitize"
# Install dependencies
npm install
# Run locally
npm run dev
```

### Build (Vercel/production)

```powershell
npm install
npm run build
```

Or use the helper scripts:

```powershell
# Build
.\tools\windows-build.ps1
# Run dev
.\tools\windows-dev.ps1
```

> Note: `npm ci || npm install` is **bash syntax** and will fail in PowerShell.


## Windows (PowerShell) – quick start

Open **the folder that contains `package.json`**.

### Install + run (dev)
```powershell
npm install
npm run dev
```

### Build (for Vercel / production)
```powershell
npm install
npm run build
```

> Tip: PowerShell does **not** support bash operators like `npm ci || npm install`.
> Use one command at a time, or run the helper scripts in `tools/`:
> - `tools\windows-dev.ps1`
> - `tools\windows-build.ps1`


## Deploy (GitHub + Vercel)

### 1) Local run
```bash
npm install
npm run dev
```

### 2) Git init + first push
```bash
git init
git add .
git commit -m "VendorScore v0.5.19"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
git push -u origin main
```

### 3) Vercel settings (important)
- In Vercel → Project → **Environment Variables** set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- If you ever saw: **Permission denied** on `node_modules/.bin/vite`:
  - Vercel → Deployments → **Redeploy** → choose **Clear cache** (one time).
  - This repo also runs build via `node ./node_modules/vite/bin/vite.js` to avoid exec-bit issues.
