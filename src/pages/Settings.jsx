import { useMemo, useState } from "react";
import Notice from "../components/Notice";
import { clearRuntimeConfig, getRuntimeConfig, setRuntimeConfig } from "../lib/runtimeConfig";
import { useApp } from "../state/AppState";

export default function Settings() {
  const { hardResetClient } = useApp();
  const cfg = useMemo(() => getRuntimeConfig(), []);
  const [url, setUrl] = useState(cfg.url);
  const [anonKey, setAnonKey] = useState(cfg.anonKey);

  const isProd = import.meta.env.PROD;

  function save() {
    setRuntimeConfig({ url: url.trim(), anonKey: anonKey.trim() });
    hardResetClient();
  }

  function clear() {
    clearRuntimeConfig();
    hardResetClient();
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Configuratie</h1>
        <p className="text-sm text-slate-700 mt-1">
          In <span className="font-semibold">productie</span> (Vercel) hoort Supabase-config via{" "}
          <span className="font-mono">VITE_SUPABASE_URL</span> en{" "}
          <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> te komen.
          Medewerkers hoeven (en kunnen) dit dan niet lokaal opslaan.
        </p>

        {isProd ? (
          <div className="mt-4">
            <Notice title="Productie staat op 'env-only'">
              Deze pagina is in productie read-only. Zet de variabelen in Vercel en redeploy.{" "}
              <div className="mt-2 text-sm">
                Huidige status: <span className="badge">{cfg.source}</span>
              </div>
            </Notice>

            <div className="mt-4 grid gap-3 opacity-60">
              <div className="space-y-1">
                <label>Supabase URL</label>
                <input className="w-full" value={url} readOnly />
              </div>
              <div className="space-y-1">
                <label>Supabase anon key</label>
                <textarea className="w-full min-h-[120px]" value={anonKey} readOnly />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            <div className="space-y-1">
              <label>Supabase URL</label>
              <input
                className="w-full"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
              />
            </div>
            <div className="space-y-1">
              <label>Supabase anon key</label>
              <textarea
                className="w-full min-h-[120px]"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOi..."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={save}>
                Opslaan & reload
              </button>
              <button className="btn" onClick={clear}>
                Wissen
              </button>
            </div>

            <div className="text-sm text-slate-700">
              Huidige bron: <span className="badge">{cfg.source}</span>
            </div>
          </div>
        )}
      </div>

      <Notice title="Vercel checklist">
        <ol className="list-decimal ml-5 space-y-1">
          <li>Vercel → Project → Settings → Environment Variables</li>
          <li>
            Zet <span className="font-mono">VITE_SUPABASE_URL</span> en{" "}
            <span className="font-mono">VITE_SUPABASE_ANON_KEY</span>
          </li>
          <li>Redeploy (of “Redeploy latest”)</li>
        </ol>
      </Notice>
    </div>
  );
}
