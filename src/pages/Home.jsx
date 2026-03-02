import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { calculateTotalScore, totalScoreToStars } from "../lib/scoring";
import Notice from "../components/Notice";
import { getRuntimeConfig } from "../lib/runtimeConfig";
import { useApp } from "../state/AppState";

export default function Home() {
  const { session, organization } = useApp();
  const cfg = getRuntimeConfig();
  const client = supabase();
  const [stats, setStats] = useState({ suppliers: 0, evaluations: 0, avg: null, stars: null, byClass: {} });
  const [statsErr, setStatsErr] = useState("");
  const [statsLoading, setStatsLoading] = useState(false);

  const classOrder = useMemo(() => ["Strategisch","Knelpunt","Hefboom","Routine"], []);

  useEffect(() => {
    async function run() {
      setStatsErr("");
      if (!session || !organization || !client) return;
      setStatsLoading(true);

      // suppliers count + classification distribution
      const { data: s, error: sErr } = await client
        .from("suppliers")
        .select("id,classification");
      if (sErr) { setStatsErr(sErr.message); setStatsLoading(false); return; }

      const byClass = {};
      for (const row of (s || [])) {
        const c = row.classification || "Onbekend";
        byClass[c] = (byClass[c] || 0) + 1;
      }

      const suppliersCount = (s || []).length;

      // evaluations count
      const { data: e, error: eErr } = await client
        .from("evaluations")
        .select("id,supplier_id,strategy,created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      if (eErr) { setStatsErr(eErr.message); setStatsLoading(false); return; }

      const evaluationsCount = (e || []).length;

      // Compute average of latest evaluation per supplier (best-effort)
      let avg = null;
      let stars = null;
      try {
        const latestBySupplier = new Map();
        for (const ev of (e || [])) {
          if (!latestBySupplier.has(ev.supplier_id)) latestBySupplier.set(ev.supplier_id, ev);
        }
        const latestEvals = Array.from(latestBySupplier.values()).slice(0, 25); // keep it light
        if (latestEvals.length) {
          const evalIds = latestEvals.map((x) => x.id);

          const { data: crit, error: cErr } = await client
            .from("criteria")
            .select("id,k_block,points_max");
          if (cErr) throw cErr;

          const sections = {};
          for (const c of (crit || [])) {
            const b = c.k_block;
            if (!sections[b]) sections[b] = [];
            sections[b].push({ id: c.id, points_max: c.points_max });
          }

          const { data: w, error: wErr } = await client
            .from("weight_configs")
            .select("strategy,k_block,weight");
          if (wErr) throw wErr;

          const weightsByStrategy = {};
          for (const row of (w || [])) {
            if (!weightsByStrategy[row.strategy]) weightsByStrategy[row.strategy] = {};
            weightsByStrategy[row.strategy][row.k_block] = row.weight;
          }

          const { data: scRows, error: scErr } = await client
            .from("evaluation_scores")
            .select("evaluation_id,criteria_id,score")
            .in("evaluation_id", evalIds);
          if (scErr) throw scErr;

          const scoresByEval = {};
          for (const r of (scRows || [])) {
            if (!scoresByEval[r.evaluation_id]) scoresByEval[r.evaluation_id] = {};
            scoresByEval[r.evaluation_id][r.criteria_id] = { score: r.score };
          }

          const totals = [];
          for (const ev of latestEvals) {
            const scores = scoresByEval[ev.id] || {};
            const weightByBlock = weightsByStrategy[ev.strategy] || {};
            const { total } = calculateTotalScore({ sections, scores, weightByBlock });
            if (Number.isFinite(total)) totals.push(total);
          }
          if (totals.length) {
            avg = Math.round((totals.reduce((a,n)=>a+n,0) / totals.length) * 10) / 10;
            stars = totalScoreToStars(avg);
          }
        }
      } catch (ex) {
        // best effort; keep dashboard usable
      }

      setStats({ suppliers: suppliersCount, evaluations: evaluationsCount, avg, stars, byClass });
      setStatsLoading(false);
    }
    run();
  }, [session, organization, client, classOrder]);

  return (
    <div className="space-y-4">
      <div className="section-card">
        <div className="section-head">
          <div>
            <h1 className="page-title">Welkom</h1>
            <p className="page-subtitle mt-1">Leveranciers beoordelen, helder en consistent.</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="badge">Gilde stijl</span>
            <span className="badge">K1–K5</span>
          </div>
        </div>
        <div className="p-6">
        {session && organization ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
            <div className="card p-4 glass-soft">
              <div className="text-xs text-slate-600">Leveranciers</div>
              <div className="text-2xl font-semibold mt-1">{statsLoading ? "…" : stats.suppliers}</div>
            </div>
            <div className="card p-4 glass-soft">
              <div className="text-xs text-slate-600">Beoordelingen</div>
              <div className="text-2xl font-semibold mt-1">{statsLoading ? "…" : stats.evaluations}</div>
            </div>
            <div className="card p-4 glass-soft">
              <div className="text-xs text-slate-600">Gemiddelde score</div>
              <div className="text-2xl font-semibold mt-1">{statsLoading ? "…" : (stats.avg ?? "—")}</div>
              <div className="text-xs text-slate-600 mt-1">{stats.stars ? `${stats.stars}★` : ""}</div>
            </div>
            <div className="card p-4 glass-soft">
              <div className="text-xs text-slate-600">Classificaties</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(stats.byClass || {}).length ? (
                  ["Strategisch","Knelpunt","Hefboom","Routine"].map((k) => (
                    <span key={k} className="badge">{k}: {stats.byClass?.[k] || 0}</span>
                  ))
                ) : (
                  <span className="text-sm text-slate-600">{statsLoading ? "…" : "Nog geen data"}</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {statsErr ? <Notice title="Dashboard" tone="danger">{statsErr}</Notice> : null}

        <p className="mt-2 text-slate-700">
          VendorScore helpt je leveranciers objectief te beoordelen op basis van K1–K5 criteria en de Excel-wegingsmatrix.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {!session ? <Link className="btn btn-primary" to="/login">Inloggen</Link> : null}
          {!organization ? (
            <Link className="btn" to="/org">Organisatie kiezen</Link>
          ) : (
            <Link className="btn" to="/suppliers">Naar leveranciers</Link>
          )}
          <Link className="btn" to="/settings">Runtime config</Link>
          <Link className="btn" to="/onboarding">Onboarding</Link>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          Config bron: <span className="badge">{cfg.source}</span>
        </div>
      </div>
      </div>

      <Notice title="Nieuwe medewerker? (account + invite code)">
        Volg de stappen in <Link className="underline" to="/onboarding">/onboarding</Link>.
        <div className="mt-2 text-sm text-slate-700">
          Korte versie: maak een account (tab <b>Account</b> op <span className="font-mono">/login</span>) en vul daarna je invite
          code in op <span className="font-mono">/onboarding</span>.
        </div>
      </Notice>
    </div>
  );
}
