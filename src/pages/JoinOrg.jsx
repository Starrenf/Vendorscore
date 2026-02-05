import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

/**
 * Backwards-compatible route: /join/:slug
 * We now treat :slug as an invite code.
 */
export default function JoinOrg() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { session, setOrg } = useApp();
  const client = supabase();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        if (!session) {
          // Not logged in yet -> send to onboarding where login guidance exists
          nav(`/onboarding?code=${encodeURIComponent(slug || "")}`);
          return;
        }

        if (!slug) {
          nav("/onboarding");
          return;
        }

        const { data: orgId, error: joinErr } = await client.rpc("join_org_by_invite", {
          p_code: slug,
        });
        if (joinErr) throw joinErr;

        const { data: orgRow, error: orgErr } = await client
          .from("organizations")
          .select("id,name,slug")
          .eq("id", orgId)
          .single();
        if (orgErr) throw orgErr;

        setOrg(orgRow);
        nav("/suppliers");
      } catch (e) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [client, nav, session, setOrg, slug]);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Organisatie koppelen</h1>
        <p className="text-sm text-slate-600 mt-1">
          We koppelen je account aan een organisatie via een <b>invite code</b>.
        </p>

        {err ? (
          <div className="mt-4">
            <Notice kind="error" title="Fout">
              {err}
            </Notice>
            <div className="mt-3 text-sm">
              Ga naar <Link className="text-blue-700 underline" to="/onboarding">Onboarding</Link> om
              het opnieuw te proberen.
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4">
            <Notice kind="info" title="Bezig">
              Koppeling wordt uitgevoerd...
            </Notice>
          </div>
        ) : null}

        {!loading && !err ? (
          <div className="mt-4">
            <Notice kind="ok" title="Gekoppeld">
              Je wordt doorgestuurd...
            </Notice>
          </div>
        ) : null}
      </div>
    </div>
  );
}
