import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

export default function Onboarding() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, setOrg, organization } = useApp();
  const client = supabase();

  const [code, setCode] = useState(searchParams.get("code") || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const didAutoJoin = useRef(false);

  useEffect(() => {
    const nextCode = searchParams.get("code") || "";
    setCode(nextCode);
  }, [searchParams]);

  useEffect(() => {
    if (!session) {
      const next = searchParams.get("code")
        ? `/onboarding?code=${encodeURIComponent(searchParams.get("code"))}`
        : "/onboarding";
      nav(`/login?next=${encodeURIComponent(next)}`, { replace: true });
      return;
    }
    if (!client) {
      nav("/settings", { replace: true });
    }
  }, [session, client, nav, searchParams]);

  useEffect(() => {
    if (organization?.id) {
      nav("/suppliers", { replace: true });
    }
  }, [organization, nav]);

  async function joinByInvite(inviteCode, options = {}) {
    const { silent = false } = options;
    const trimmed = (inviteCode ?? code ?? "").trim();

    setErr("");
    if (!trimmed) {
      if (!silent) setErr("Vul een invite-code in.");
      return false;
    }
    if (!client) {
      if (!silent) setErr("Supabase is nog niet geconfigureerd. Controleer eerst Settings.");
      return false;
    }

    setBusy(true);
    if (silent) {
      setInfo("Invite-link gevonden. We koppelen je account automatisch aan de organisatie...");
    } else {
      setInfo("");
    }

    try {
      const { data: orgId, error: rpcErr } = await client.rpc("join_org_by_invite", { p_code: trimmed });
      if (rpcErr || !orgId) {
        throw rpcErr || new Error("Invite-code niet gevonden of niet meer geldig.");
      }

      const { data: org, error: fetchErr } = await client
        .from("organizations")
        .select("id, name")
        .eq("id", orgId)
        .maybeSingle();

      if (fetchErr || !org) {
        throw fetchErr || new Error("Kon organisatie niet ophalen na koppelen.");
      }

      window.localStorage.setItem("VENDORSPRO_ORG_ID", org.id);
      setOrg(org);
      setInfo("");
      nav("/suppliers", { replace: true });
      return true;
    } catch (e) {
      const message = e?.message || "Invite-code niet gevonden of niet meer geldig.";
      setErr(message);
      setInfo("");
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const inviteCode = (searchParams.get("code") || "").trim();
    if (!session || !client || !inviteCode || didAutoJoin.current || busy) return;

    didAutoJoin.current = true;
    joinByInvite(inviteCode, { silent: true });
  }, [session, client, searchParams, busy]);

  function onSubmit(e) {
    e.preventDefault();
    joinByInvite(code, { silent: false });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Koppel je aan een organisatie</h1>
        <p className="text-sm text-slate-600 mt-1">
          Nieuwe medewerker? Vraag je admin om een <b>invite-code</b> of open direct de invite-link.
        </p>

        {info ? <Notice title="Bezig met koppelen" tone="info">{info}</Notice> : null}
        {err ? <Notice title="Fout bij koppelen" tone="danger">{err}</Notice> : null}

        <div className="mt-4 space-y-3">
          <h2 className="font-semibold">Invite-code</h2>
          <form onSubmit={onSubmit} className="space-y-2">
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
            Invite-link ontvangen? Dan kun je ook direct openen via <span className="badge">/onboarding?code=…</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Geen organisatie zichtbaar?</h2>
        <p className="text-sm text-slate-600 mt-1">
          Alleen admins kunnen organisaties beheren en invite-codes genereren. Vraag je admin om een nieuwe invite-link als deze verlopen is.
        </p>
        <Link to="/methodiek" className="text-sm underline">Bekijk de methodiek</Link>
      </div>
    </div>
  );
}
