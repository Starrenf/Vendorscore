import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

export default function JoinOrg() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { session, setOrg } = useApp();
  const client = supabase();

  const [org, setOrgRow] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Guard to prevent accidental re-fetch loops
  const lookedUpRef = useRef(false);

  useEffect(() => {
    lookedUpRef.current = false;
    setOrgRow(null);
    setErr("");
  }, [slug]);

  useEffect(() => {
    async function run() {
      if (!session) { nav("/login"); return; }
      if (!client) { nav("/settings"); return; }
      if (!slug) return;
      if (lookedUpRef.current) return;
      lookedUpRef.current = true;

      const { data, error } = await client
        .from("organizations")
        .select("id, name, display_name, slug, is_public")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        return;
      }
      if (!data) {
        setErr("Organisatie niet gevonden.");
        return;
      }
      setOrgRow(data);
    }
    run();
  }, [slug, session, client, nav]);

  async function join() {
    setErr("");
    if (!org) return;
    setBusy(true);

    // Preferred: only allow joining public orgs via this path
    if (org.is_public !== true) {
      setErr("Deze organisatie is niet beschikbaar via slug-join. Gebruik een join-code of vraag je admin.");
      setBusy(false);
      return;
    }

    const { error } = await client
      .from("profiles")
      .update({ organization_id: org.id })
      .eq("id", session.user.id);

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    window.localStorage.setItem("VENDORSCORE_ORG_ID", org.id);
    setOrg(org);
    setBusy(false);
    nav("/suppliers");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Join organisatie</h1>
        <p className="text-sm text-slate-600 mt-1">
          Slug: <span className="badge">{slug}</span>
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        {!org ? (
          <Notice title="Zoeken…" tone="info">We zoeken de organisatie op basis van de slug.</Notice>
        ) : (
          <div className="space-y-3 mt-3">
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="font-semibold">{org.display_name || org.name || org.slug}</div>
              <div className="text-xs text-slate-500">slug: {org.slug}</div>
              {org.is_public ? <div className="mt-2"><span className="badge">publiek</span></div> : <div className="mt-2"><span className="badge">niet publiek</span></div>}
            </div>

            <button className="btn w-full" onClick={join} disabled={busy}>
              {busy ? "Bezig…" : "Join & ga verder"}
            </button>

            <div className="text-xs text-slate-500">
              Lukt dit niet? Ga naar <Link className="underline" to="/onboarding">Onboarding</Link> en gebruik een join-code of kies uit de lijst.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
