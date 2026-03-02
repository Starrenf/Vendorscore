import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

export default function OrgHub() {
  const nav = useNavigate();
  const { session, organization, setOrg } = useApp();
  const client = supabase();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [profileOrg, setProfileOrg] = useState(null);

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session) { nav("/login"); return; }
      if (!client) { nav("/settings"); return; }

      setLoading(true);
      const { data: prof, error: profErr } = await client
        .from("profiles")
        .select("organization_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profErr) {
        setErr(profErr.message);
        setLoading(false);
        return;
      }

      if (!prof?.organization_id) {
        setProfileOrg(null);
        setLoading(false);
        return;
      }

      const { data: org, error: orgErr } = await client
        .from("organizations")
        .select("id, name, display_name, slug")
        .eq("id", prof.organization_id)
        .maybeSingle();

      if (orgErr) setErr(orgErr.message);
      else setProfileOrg(org);

      setLoading(false);
    }
    run();
  }, [session, client, nav]);

  function choose(org) {
    setOrg(org);
    window.localStorage.setItem("VENDORSCORE_ORG_ID", org.id);
    nav("/suppliers");
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Organisatie</h1>
        <p className="text-sm text-slate-600 mt-1">
          Beheer leveranciers en beoordelingen binnen jouw organisatie.
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        {loading ? (
          <Notice title="Laden…" tone="info">Even geduld…</Notice>
        ) : !profileOrg ? (
          <div className="space-y-3 mt-3">
            <Notice title="Nog niet gekoppeld" tone="warning">
              Je account is nog niet gekoppeld aan een organisatie.
            </Notice>
            <Link className="btn" to="/onboarding">Koppel organisatie</Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="font-semibold">{profileOrg.display_name || profileOrg.name || profileOrg.slug}</div>
              <div className="text-xs text-slate-500">slug: {profileOrg.slug}</div>
            </div>
            <button className="btn" onClick={() => choose(profileOrg)}>
              Open deze organisatie
            </button>
          </div>
        )}

        {organization ? (
          <div className="mt-4 text-xs text-slate-500">
            Huidige selectie: <span className="badge">{organization.display_name || organization.name || organization.slug}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
