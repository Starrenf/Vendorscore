## Supabase: wijzigingen worden niet opgeslagen

Als je een wijziging doet en je ziet 'Opslaan mislukt: geen data teruggekregen', dan is dit bijna altijd:

1) Je account is niet gekoppeld aan een organisatie (organization_id).
   - Ga naar **Onboarding** en join een organisatie (slug/invite).
2) RLS policies blokkeren INSERT/UPDATE.
   - Controleer policies op suppliers, evaluations, evaluation_scores, weight_configs, organizations.
3) Je Vercel env vars ontbreken:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

Deze build is aangepast zodat writes niet meer stil falen.
