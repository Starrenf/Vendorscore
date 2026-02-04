import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

export default function Onboarding() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, setOrg } = useApp();
  const client = supabase();

  const [orgs, setOrgs] = useState([]);
  const [q, setQ] = useState("");
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return orgs;
    return orgs.filter((o) => {
      const name = (o.display_name || o.name || o.slug || "").toLowerCase();
      return name.includes(needle);
    });
  }, [orgs, q]);

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session) { nav("/login"); return; }
      if (!client) { nav("/settings"); return; }

      setLoading(true);
      const { data, error } = await client
        .from("organizations")
        .select("id, name, display_name, slug, is_public")
        .eq("is_public", true)
        .order("display_name", { ascending: true });

      if (error) setErr(error.message);
      else setOrgs(data || []);
      setLoading(false);
    }
    run();
  }, [session, client, nav]);

  async function selectOrg(org) {
    setErr("");
    setBusy(true);

    // Join by selecting a public org (allowed by policy in reset script)
    const { error } = await client
      .from("profiles")
      .update({ organization_id: org.id })
      .eq("id", session.user.id);

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    // Persist selection locally (keeps current UX pattern)
    window.localStorage.setItem("VENDORSCORE_ORG_ID", org.id);
    setOrg(org);
    setBusy(false);
    nav("/suppliers");
  }

  async function joinByCode(e) {
    e?.preventDefault();
    setErr("");
    const trimmed = (code || "").trim();
    if (!trimmed) { setErr("Vul een join-code in."); return; }
    setBusy(true);

    // Prefer RPC (security definer) when available
    let orgId = null;
    const { data: rpcData, error: rpcErr } = await client.rpc("join_org_by_code", { p_code: trimmed });
    if (!rpcErr) orgId = rpcData;

    // Fallback: try lookup + profile update (works if you allow it)
    if (rpcErr) {
      const { data: orgRow, error: orgErr } = await client
        .from("organizations")
        .select("id, name, display_name, slug")
        .eq("join_code", trimmed)
        .maybeSingle();

      if (orgErr || !orgRow) {
        setErr(rpcErr?.message || orgErr?.message || "Join-code niet gevonden.");
        setBusy(false);
        return;
      }

      const { error: updErr } = await client
        .from("profiles")
        .update({ organization_id: orgRow.id })
        .eq("id", session.user.id);

      if (updErr) {
        setErr(updErr.message);
        setBusy(false);
        return;
      }
      orgId = orgRow.id;
    }

    // Fetch org for UI/state
    const { data: org, error: fetchErr } = await client
      .from("organizations")
      .select("id, name, display_name, slug")
      .eq("id", orgId)
      .maybeSingle();

    if (fetchErr || !org) {
      setErr(fetchErr?.message || "Kon organisatie niet ophalen na join.");
      setBusy(false);
      return;
    }

    window.localStorage.setItem("VENDORSCORE_ORG_ID", org.id);
    setOrg(org);
    setBusy(false);
    nav("/suppliers");
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Koppel je aan een organisatie</h1>
        <p className="text-sm text-slate-600 mt-1">
          Nieuwe medewerker? Kies je organisatie uit de lijst of gebruik een join-code.
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Zoek & selecteer</h2>
              <span className="text-xs text-slate-500">alleen publieke organisaties</span>
            </div>

            <input
              className="input w-full"
              placeholder="Zoek op naam…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading || busy}
            />

            {loading ? (
              <div className="text-sm text-slate-600">Laden…</div>
            ) : (
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <div className="text-sm text-slate-600">Geen organisaties gevonden.</div>
                ) : (
                  filtered.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-3">
                      <div>
                        <div className="font-medium">{o.display_name || o.name || o.slug}</div>
                        <div className="text-xs text-slate-500">slug: {o.slug}</div>
                      </div>
                      <button className="btn" onClick={() => selectOrg(o)} disabled={busy}>
                        Selecteer
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Join-code</h2>
            <form onSubmit={joinByCode} className="space-y-2">
              <input
                className="input w-full"
                placeholder="Bijv. GILDE2026"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={busy}
              />
              <button className="btn w-full" disabled={busy}>
                {busy ? "Bezig…" : "Join & ga verder"}
              </button>
            </form>

            <div className="text-xs text-slate-500">
              Tip: een admin kan een join-code of link delen. Voorbeeld:{" "}
              <span className="badge">/onboarding?code=GILDE2026</span>
            </div>

            <div className="text-xs text-slate-500">
              Of gebruik nog de oude slug-link:{" "}
              <Link className="underline" to="/join/gilde-opleidingen">/join/&lt;slug&gt;</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Geen organisatie zichtbaar?</h2>
        <p className="text-sm text-slate-600 mt-1">
          Vraag je admin om de organisatie “publiek” te zetten voor onboarding, of om een join-code te delen.
        </p>
        <Link to="/methodiek" className="text-sm underline">Bekijk de methodiek</Link>
      </div>
    </div>
  );
}
