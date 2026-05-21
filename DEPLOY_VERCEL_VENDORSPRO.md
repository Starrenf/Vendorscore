# VendorScore Pro Pro - Vercel deploy

## Environment Variables in Vercel
Add these two variables to all environments:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use:

```env
VITE_SUPABASE_URL=https://ryycmiwavqfagcvghgxw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Important:
- Use the **publishable key** from Supabase.
- Do **not** use the secret key.

## Local start

```bash
npm install
npm run dev
```

## Git + Vercel

```bash
git init
git add .
git commit -m "VendorScore Pro Pro v0.7.22 deploy ready"
git branch -M main
git remote add origin https://github.com/Starrenf/VenderscorePro.git
git push -u origin main --force
```

Then connect the repo in Vercel and redeploy.
