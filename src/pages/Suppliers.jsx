import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import { normalizeClassification } from "../lib/normalizeClassification";
import { useToast } from "../components/ToastProvider";

export default function Suppliers() {
  
  const toast = useToast();
const nav = useNavigate();
  const { session, organization } = useApp();
  const client = supabase();

  const [rows, setRows] = useState([]);
  const [scoreBySupplier, setScoreBySupplier] = useState({}); // supplier_id -> { total, stars }
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session) { nav("/login"); return; }
      if (!organization) { nav("/onboarding"); return; }
      if (!client) { nav("/settings"); return; }

      setLoading(true);
      const { data, error } = await client
        .from("suppliers")
        .select("id,name,is_active,created_at,classification")
        .order("name", { ascending: true });

      if (error) {
        setErr(error.message);
        toast.error(error?.message || "Onbekende fout");
      }
      setRows(data || []);

      // Best-effort: compute latest evaluation score per supplier (for a quick visual).
      try {
        const supplierIds = (data || []).map((r) => r.id);
        if (supplierIds.length) {
          const { data: evals, error: eErr } = await client
            .from("evaluations")
            .select("id,supplier_id,strategy,created_at")
            .eq("organization_id", organization.id)
            .in("supplier_id", supplierIds)
            .order("created_at", { ascending: false });
          if (!eErr && evals?.length) {
            const latest = new Map();
            for (const ev of evals) {
              if (!latest.has(ev.supplier_id)) latest.set(ev.supplier_id, ev);
            }
            const latestEvals = Array.from(latest.values());
            const evalIds = latestEvals.map((x) => x.id);

            const { data: crit } = await client
              .from("criteria")
              .select("id,k_block,points_max");
            const sections = {};
            for (const c of (crit || [])) {
              if (!sections[c.k_block]) sections[c.k_block] = [];
              sections[c.k_block].push({ id: c.id, points_max: c.points_max });
            }

            const { data: w } = await client
              .from("weight_configs")
              .select("strategy,k_block,weight");
            const weightsByStrategy = {};
            for (const row of (w || [])) {
              if (!weightsByStrategy[row.strategy]) weightsByStrategy[row.strategy] = {};
              weightsByStrategy[row.strategy][row.k_block] = row.weight;
            }

            const { data: scRows } = await client
              .from("evaluation_scores")
              .select("evaluation_id,criteria_id,score")
              .in("evaluation_id", evalIds);
            const scoresByEval = {};
            for (const r of (scRows || [])) {
              if (!scoresByEval[r.evaluation_id]) scoresByEval[r.evaluation_id] = {};
              scoresByEval[r.evaluation_id][r.criteria_id] = { score: r.score };
            }

            // local calc (same as EvaluationDetail)
            function calcTotal(sections, scores, weightByBlock) {
              const blocks = Object.keys(sections).sort();
              const rawWeights = blocks.map((b) => Number(weightByBlock?.[b] ?? 0));
              const totalRaw = rawWeights.reduce((a,n)=>a+n,0) || 1;
              const norm = Object.fromEntries(blocks.map((b,i)=>[b, rawWeights[i]/totalRaw]));
              let total = 0;
              for (const b of blocks) {
                const cs = sections[b] || [];
                let sum=0, max=0;
                for (const c of cs) {
                  const row = scores?.[c.id];
                  sum += Number(row?.score) || 0;
                  max += Number(c.points_max) || 0;
                }
                const M = max ? (sum/max)*10 : 0;
                total += M * (norm[b] || 0) * 10;
              }
              return Math.round(total*10)/10;
            }

            const map = {};
            for (const ev of latestEvals) {
              const scores = scoresByEval[ev.id] || {};
              const weightByBlock = weightsByStrategy[ev.strategy] || {};
              const total = calcTotal(sections, scores, weightByBlock);
              const stars = total >= 100 ? 5 : total >= 75 ? 4 : total >= 60 ? 3 : total >= 40 ? 2 : 1;
              map[ev.supplier_id] = { total, stars };
            }
            setScoreBySupplier(map);
          }
        }
      } catch {
        // ignore, list stays usable
      }

      setLoading(false);
    }
    run();
  }, [session, organization, client, nav]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => (r.name || "").toLowerCase().includes(s));
  }, [rows, q]);

  async function addSupplier(e) {
    e.preventDefault();
    setErr("");
    const n = name.trim();
    if (!n) return;

    // simpele validatie: voorkom dubbele namen binnen dezelfde organisatie
    const exists = rows.some(r => (r.name || "").trim().toLowerCase() === n.toLowerCase());
    if (exists) {
      setErr("Deze leverancier bestaat al binnen deze organisatie.");
      return;
    }

    const { data, error } = await client
      .from("suppliers")
      .insert({ organization_id: organization.id, name: n, is_active: true })
      .select("id,name,is_active,created_at,classification")
      .single();

    if (error || !data) setErr(error?.message || "Opslaan mislukt: geen data teruggekregen (mogelijk RLS/policies of ontbrekende organisatie-koppeling).");
    else {
      setRows(prev => [...prev, data].sort((a,b)=>a.name.localeCompare(b.name)));
      setName("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Leveranciers</h1>
            <p className="text-sm text-slate-600 mt-1">Binnen organisatie: <span className="badge">{organization?.name}</span></p>
          </div>
          <Link className="btn btn-primary" to="/evaluations/new">Nieuwe beoordeling</Link>
        </div>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        <div className="mt-4 grid md:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <label>Zoeken</label>
            <input value={q} onChange={(e)=>setQ(e.target.value)} className="w-full" placeholder="Typ om te filteren…" />
          </div>

          <form className="space-y-2" onSubmit={addSupplier}>
            <label>Nieuwe leverancier</label>
            <div className="flex gap-2">
              <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full" placeholder="Naam leverancier" />
              <button className="btn btn-primary" type="submit">Toevoegen</button>
            </div>
          </form>
        </div>

        <div className="mt-4 grid gap-3">
          {loading ? <div className="text-sm text-slate-600">Laden…</div> : null}
          {!loading && filtered.length === 0 ? (
            <Notice title="Geen leveranciers">
              Voeg je eerste leverancier toe, of kies een andere organisatie.
            </Notice>
          ) : null}

          {filtered.map(s => (
            <div key={s.id} className="card p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-slate-600">
                  {s.is_active === false ? <span className="badge">inactief</span> : <span className="badge">actief</span>}
                </div>
              </div>
              <Link className="btn" to={`/suppliers/${s.id}`}>Details</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
