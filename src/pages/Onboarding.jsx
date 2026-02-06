import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

export default function Onboarding() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, setOrg } = useApp();
  const client = supabase();

  const [code, setCode] = useState(searchParams.get("code") || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session) { nav("/login"); return; }
      if (!client) { nav("/settings"); return; }
    }
    run();
  }, [session, client, nav]);

  async function joinByInvite(e) {
    e?.preventDefault();
    setErr("");
    const trimmed = (code || "").trim();
    if (!trimmed) { setErr("Vul een invite-code in."); return; }
    setBusy(true);

    // Join is only allowed via security definer RPC (no direct profile update)
    const { data: orgId, error: rpcErr } = await client.rpc("join_org_by_invite", { p_code: trimmed });
    if (rpcErr || !orgId) {
      setErr(rpcErr?.message || "Invite-code niet gevonden of niet meer geldig.");
      setBusy(false);
      return;
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
          Nieuwe medewerker? Vraag je admin om een <b>invite-code</b> en vul die hieronder in.
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        <div className="mt-4 space-y-3">
          <h2 className="font-semibold">Invite-code</h2>
          <form onSubmit={joinByInvite} className="space-y-2">
            <input
              className="input w-full"
              placeholder="Bijv. GILDE-9F3K-7A2Q"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
            <button className="btn w-full" disabled={busy}>
              {busy ? "Bezig…" : "Join & ga verder"}
            </button>
          </form>

          <div className="text-xs text-slate-500">
            Tip: je kunt ook een link krijgen zoals{" "}
            <span className="badge">/onboarding?code=…</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Geen organisatie zichtbaar?</h2>
        <p className="text-sm text-slate-600 mt-1">
          Alleen admins kunnen organisaties beheren en invite-codes genereren. Vraag je admin om een invite-code.
        </p>
        <Link to="/methodiek" className="text-sm underline">Bekijk de methodiek</Link>
      </div>
    </div>
  );
}
