import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import Notice from "../components/Notice";
import { calculateTotalScore, mapWeightsForStrategy, totalScoreToStars } from "../lib/scoring";

function riskTone(avg) {
  if (avg == null || !Number.isFinite(avg)) return { label: "Onbekend", tone: "muted" };
  if (avg >= 80) return { label: "Stabiel", tone: "good" };
  if (avg >= 60) return { label: "Aandacht", tone: "warn" };
  return { label: "Hoog risico", tone: "bad" };
}

export default function Insights() {
  const { session, organization } = useApp();
  const client = supabase();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [byClass, setByClass] = useState([]);
  const [blockAvg, setBlockAvg] = useState({});
  const [blockPct, setBlockPct] = useState({});
  const blocks = useMemo(() => ["K1", "K2", "K3", "K4", "K5"], []);

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session || !organization || !client) return;

      setLoading(true);
      try {
        const { data: suppliers, error: sErr } = await client
          .from("suppliers")
          .select("id,classification");
        if (sErr) throw sErr;

        const { data: evals, error: eErr } = await client
          .from("evaluations")
          .select("id,supplier_id,strategy,created_at")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });
        if (eErr) throw eErr;

        const latestBySupplier = new Map();
        for (const ev of evals || []) {
          if (!latestBySupplier.has(ev.supplier_id)) latestBySupplier.set(ev.supplier_id, ev);
        }
        const latest = Array.from(latestBySupplier.values());
        const evalIds = latest.map((x) => x.id);

        const { data: crit, error: cErr } = await client
          .from("criteria")
          .select("id,k_block,points_max");
        if (cErr) throw cErr;

        const sections = {};
        for (const c of crit || []) {
          const b = c.k_block;
          if (!sections[b]) sections[b] = [];
          sections[b].push({ id: c.id, points_max: c.points_max });
        }

        const { data: w, error: wErr } = await client
          .from("weight_configs")
          .select("organization_id,strategy,k_block,weight")
          .eq("organization_id", organization.id);
        if (wErr) throw wErr;

        const weightRows = w || [];

        const scoresByEval = {};
        if (evalIds.length) {
          const { data: scRows, error: scErr } = await client
            .from("evaluation_scores")
            .select("*")
            .in("evaluation_id", evalIds);
          if (scErr) throw scErr;

          for (const r of scRows || []) {
            const criteriaId = r.criteria_id ?? r.criteriaId;
            if (!criteriaId) continue;
            if (!scoresByEval[r.evaluation_id]) scoresByEval[r.evaluation_id] = {};
            scoresByEval[r.evaluation_id][criteriaId] = { score: r.score ?? 0 };
          }
        }

        const classBySupplier = {};
        for (const s of suppliers || []) {
          classBySupplier[s.id] = s.classification || "Onbekend";
        }

        const totalsBySupplier = {};
        const contribSum = { K1: 0, K2: 0, K3: 0, K4: 0, K5: 0 };
        let contribCount = 0;

        for (const ev of latest) {
          const scores = scoresByEval[ev.id] || {};
          const weightByBlock = mapWeightsForStrategy(weightRows, ev.strategy);

          const { total, norm } = calculateTotalScore({ sections, scores, weightByBlock });
          totalsBySupplier[ev.supplier_id] = total;

          for (const b of blocks) {
            const cs = sections[b] || [];
            let sum = 0, max = 0;
            for (const c of cs) {
              const row = scores?.[c.id];
              sum += Number(row?.score) || 0;
              max += Number(c.points_max) || 0;
            }
            const M = max ? (sum / max) * 10 : 0;
            const O = M * (norm?.[b] || 0) * 10;
            contribSum[b] += O;
          }
          contribCount += 1;
        }

        const buckets = new Map();
        for (const [supplierId, total] of Object.entries(totalsBySupplier)) {
          const cls = classBySupplier[supplierId] || "Onbekend";
          if (!buckets.has(cls)) buckets.set(cls, []);
          if (Number.isFinite(total)) buckets.get(cls).push(total);
        }

        const classes = ["Strategisch", "Knelpunt", "Hefboom", "Routine", "Onbekend"];
        const classRows = classes.map((c) => {
          const arr = buckets.get(c) || [];
          const avg = arr.length ? Math.round((arr.reduce((a, n) => a + n, 0) / arr.length) * 10) / 10 : null;
          const stars = avg != null ? totalScoreToStars(avg) : null;
          const risk = riskTone(avg);
          const suppliersCount = (suppliers || []).filter((s) => (s.classification || "Onbekend") === c).length;
          return { classification: c, suppliers: suppliersCount, avg, stars, risk };
        });

        const avgContrib = {};
        let totalAvg = 0;
        for (const b of blocks) {
          const v = contribCount ? (contribSum[b] / contribCount) : 0;
          avgContrib[b] = Math.round(v * 10) / 10;
          totalAvg += avgContrib[b];
        }
        const pct = {};
        const denom = totalAvg || 1;
        for (const b of blocks) {
          pct[b] = Math.round((avgContrib[b] / denom) * 1000) / 10;
        }

        setByClass(classRows);
        setBlockAvg(avgContrib);
        setBlockPct(pct);
      } catch (ex) {
        setErr(ex?.message || String(ex));
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [session, organization, client, blocks]);

  const segClass = (b) => {
    if (b === "K1") return "bg-[#003A8F]";
    if (b === "K2") return "bg-[#0A4AA6]";
    if (b === "K3") return "bg-[#1358BF]";
    if (b === "K4") return "bg-[#1B66D6]";
    return "bg-[#2A7CF0]";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
      <p className="mt-1 text-slate-700">
        Strategisch overzicht op basis van de meest recente beoordeling per leverancier (binnen jouw organisatie).
      </p>

      {err ? <Notice title="Insights" tone="danger">{err}</Notice> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5 glass-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Risico per classificatie</h2>
              <p className="text-sm text-slate-600 mt-1">Gemiddelde score (0–100) en risicosignaal.</p>
            </div>
            <span className="badge">{loading ? "laden…" : "actueel"}</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="py-2 pr-3">Classificatie</th>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Gem.</th>
                  <th className="py-2 pr-3">Risico</th>
                </tr>
              </thead>
              <tbody>
                {byClass.map((r) => (
                  <tr key={r.classification} className="border-t border-slate-200/60">
                    <td className="py-2 pr-3 font-medium text-slate-900">{r.classification}</td>
                    <td className="py-2 pr-3 text-slate-700">{r.suppliers}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      {r.avg == null ? "—" : (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-semibold">{r.avg}</span>
                          <span className="text-xs text-slate-500">{r.stars ? `${r.stars}★` : ""}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                          (r.risk.tone === "good"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.risk.tone === "warn"
                            ? "bg-amber-100 text-amber-800"
                            : r.risk.tone === "bad"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700")
                        }
                      >
                        {r.risk.label}
                      </span>
                    </td>
                  </tr>
                ))}
                {!byClass.length ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={4}>
                      {loading ? "Bezig met laden…" : "Nog geen beoordelingen beschikbaar."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 glass-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">K-blokken bijdrage</h2>
              <p className="text-sm text-slate-600 mt-1">
                Gemiddelde bijdrage van K1–K5 aan de totaalscore (stacked bar).
              </p>
            </div>
            <span className="badge">{loading ? "laden…" : "actueel"}</span>
          </div>

          <div className="mt-4">
            <div className="h-10 w-full overflow-hidden rounded-xl bg-slate-200">
              <div className="flex h-full w-full">
                {blocks.map((b) => (
                  <div
                    key={b}
                    className={segClass(b)}
                    style={{ width: `${blockPct?.[b] || 0}%` }}
                    title={`${b}: ${blockAvg?.[b] ?? 0} punten (${blockPct?.[b] || 0}%)`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {blocks.map((b) => (
                <div key={b} className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={"h-3 w-3 rounded " + segClass(b)} />
                    <span className="text-sm font-semibold text-slate-900">{b}</span>
                  </div>
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold">{blockAvg?.[b] ?? 0}</span>
                    <span className="text-slate-500"> pts</span>
                    <span className="text-slate-500"> · {blockPct?.[b] || 0}%</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-600">
              Let op: dit is gebaseerd op de meest recente beoordeling per leverancier in jouw organisatie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
