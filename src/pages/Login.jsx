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

function PasswordField({ label, value, onChange, placeholder, reveal, onToggle, autoComplete = "current-password" }) {
  return (
    <div className="space-y-1">
      <label>{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={reveal ? "text" : "password"}
          required
          autoComplete={autoComplete}
          className="w-full pr-24"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          aria-label={reveal ? "Verberg wachtwoord" : "Toon wachtwoord"}
          aria-pressed={reveal}
        >
          {reveal ? "Verberg" : "Toon"}
        </button>
      </div>
    </div>
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
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [slug, setSlug] = useState(params.get("slug") || "");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const cfg = getRuntimeConfig();
  const client = supabase();
  const nextPath = params.get("next") || "";

  const canSignup = useMemo(() => true, []);

  useEffect(() => {
    if (!session) return;
    if (nextPath) {
      nav(nextPath, { replace: true });
      return;
    }
    nav("/org", { replace: true });
  }, [session, nav, nextPath]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("mode", mode);
    if (slug) next.set("slug", slug);
    else next.delete("slug");
    if (nextPath) next.set("next", nextPath);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, slug, nextPath]);

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
    else nav(nextPath || "/org", { replace: true });
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

    setInfo(
      "Account aangemaakt. Als e-mailbevestiging aan staat: check je mailbox. Daarna kun je inloggen en je aan een organisatie koppelen via de invite-link."
    );

    if (nextPath) nav(nextPath, { replace: true });
    else if (slug) nav(`/join/${encodeURIComponent(slug)}`, { replace: true });
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
            ? "Maak je account aan. Daarna koppel je jezelf aan de juiste organisatie via een invite-link of invite-code."
            : "Je moet ingelogd zijn om organisaties, leveranciers en beoordelingen te zien."}
        </p>

        {nextPath ? (
          <Notice title="Na inloggen ga je automatisch verder" tone="info">
            Je bent via een invite-link hier terechtgekomen. Na het inloggen sturen we je automatisch terug om de organisatiekoppeling af te ronden.
          </Notice>
        ) : null}

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
            <PasswordField
              label="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              reveal={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
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
              <PasswordField
                label="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 8 tekens"
                reveal={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                autoComplete="new-password"
              />
              <PasswordField
                label="Herhaal wachtwoord"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="nogmaals"
                reveal={showPassword2}
                onToggle={() => setShowPassword2((v) => !v)}
                autoComplete="new-password"
              />
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
        join-flow of invite-link.
      </Notice>
    </div>
  );
}
