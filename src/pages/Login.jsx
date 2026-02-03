import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { getRuntimeConfig } from "../lib/runtimeConfig";
import { useApp } from "../state/AppState";

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-2 rounded-xl text-sm font-medium border " +
        (active
          ? "bg-[#003A8F] text-white border-[#003A8F]"
          : "bg-white text-slate-900 border-slate-200 hover:bg-[#E8F0FB]")
      }
    >
      {children}
    </button>
  );
}

export default function Login() {
  const nav = useNavigate();
  const { session } = useApp();
  const [params, setParams] = useSearchParams();

  const [mode, setMode] = useState(() => (params.get("mode") === "signup" ? "signup" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [slug, setSlug] = useState(params.get("slug") || "");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const cfg = getRuntimeConfig();
  const client = supabase();

  const canSignup = useMemo(() => true, []);

  useEffect(() => {
    if (session) nav("/org");
  }, [session, nav]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("mode", mode);
    if (slug) next.set("slug", slug);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, slug]);

  async function onLogin(e) {
    e.preventDefault();
    setErr("");
    setInfo("");

    if (!client) {
      setErr("Supabase config ontbreekt. Ga eerst naar Settings → Runtime config (/settings).");
      return;
    }

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    else nav("/org");
  }

  async function onSignup(e) {
    e.preventDefault();
    setErr("");
    setInfo("");

    if (!client) {
      setErr("Supabase config ontbreekt. Ga eerst naar Settings → Runtime config (/settings).");
      return;
    }

    if (!canSignup) {
      setErr("Signup is uitgeschakeld in deze build.");
      return;
    }

    if (password.length < 8) {
      setErr("Kies een wachtwoord van minimaal 8 tekens.");
      return;
    }

    if (password !== password2) {
      setErr("Wachtwoorden komen niet overeen.");
      return;
    }

    const { error } = await client.auth.signUp({ email, password });
    if (error) {
      setErr(error.message);
      return;
    }

    // Afhankelijk van Supabase Auth settings kan e-mail bevestiging nodig zijn.
    setInfo(
      "Account aangemaakt. Als e-mailbevestiging aan staat: check je mailbox. Daarna kun je inloggen en je aan een organisatie koppelen via de slug."
    );

    // Als gebruiker al een sessie krijgt (email confirm uit), direct naar join flow.
    if (slug) nav(`/join/${encodeURIComponent(slug)}`);
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{mode === "signup" ? "Account aanmaken" : "Inloggen"}</h1>
          <div className="flex items-center gap-2">
            <TabButton active={mode === "login"} onClick={() => setMode("login")}>Inloggen</TabButton>
            <TabButton active={mode === "signup"} onClick={() => setMode("signup")}>Account</TabButton>
          </div>
        </div>

        <p className="text-sm text-slate-700 mt-2">
          {mode === "signup"
            ? "Maak je account aan. Daarna koppel je jezelf aan de juiste organisatie via de organisatie-slug (join-link)."
            : "Je moet ingelogd zijn om organisaties, leveranciers en beoordelingen te zien."}
        </p>

        {cfg.source === "missing_env" ? (
          <Notice title="Deployment mist Supabase instellingen" tone="danger">
            Deze Vercel deployment heeft geen <b>VITE_SUPABASE_URL</b> en/of <b>VITE_SUPABASE_ANON_KEY</b>.
            Zet ze in Vercel (Project → Settings → Environment Variables) en redeploy.
            <div className="mt-2">
              Check ook: <a href="/settings">/settings</a>
            </div>
          </Notice>
        ) : cfg.source === "missing" ? (
          <Notice title="Runtime config ontbreekt" tone="danger">
            Deze browser heeft nog geen Supabase URL + anon key. Ga naar <b>Settings → Runtime config</b> en plak ze daar.
          </Notice>
        ) : null}

        {err ? (
          <Notice title="Fout" tone="danger">
            {err}
          </Notice>
        ) : null}

        {info ? (
          <Notice title="Info" tone="info">
            {info}
          </Notice>
        ) : null}

        {mode === "login" ? (
          <form className="mt-4 space-y-3" onSubmit={onLogin}>
            <div className="space-y-1">
              <label>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@organisatie.nl"
                type="email"
                required
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label>Wachtwoord</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                required
                className="w-full"
              />
            </div>
            <button className="btn btn-primary w-full" type="submit">
              Inloggen
            </button>

            <div className="text-sm text-slate-700">
              Nog geen account? Klik hierboven op <b>Account</b>.
            </div>
          </form>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={onSignup}>
            <div className="space-y-1">
              <label>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@organisatie.nl"
                type="email"
                required
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label>Wachtwoord</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min. 8 tekens"
                  type="password"
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <label>Herhaal wachtwoord</label>
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="nogmaals"
                  type="password"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label>Organisatie-slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="bijv. gilde"
                className="w-full"
              />
              <p className="text-xs text-slate-600">
                Optioneel. Als je hem invult, sturen we je na aanmaken direct door naar de join-pagina.
              </p>
            </div>

            <button className="btn btn-accent w-full" type="submit">
              Account aanmaken
            </button>

            <Notice title="Na signup" tone="info">
              1) Log in (soms pas na e-mailbevestiging). 2) Ga naar de join-link van je organisatie:
              <div className="mt-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl p-2">
                /join/&lt;slug&gt;
              </div>
            </Notice>
          </form>
        )}
      </div>

      <Notice title="Waar maak je accounts aan?">
        Standaard kunnen medewerkers hun account hier in de app maken (tab <b>Account</b>). Alternatief is dat een beheerder
        accounts aanmaakt in Supabase (Auth → Users). Koppelen aan de juiste organisatie gebeurt daarna altijd via de
        join-flow (slug).
      </Notice>
    </div>
  );
}
