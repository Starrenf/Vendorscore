import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { ratingToFactor, totalScoreToStars } from "../lib/scoring";
import { useApp } from "../state/AppState";
import { useToast } from "../components/ToastProvider";

const RATINGS = ["Uitstekend","Goed","Redelijk","Matig","Slecht"];

export default function EvaluationDetail() {
  
  const toast = useToast();
const { id } = useParams();
  const nav = useNavigate();
  const { session, organization } = useApp();
  const client = supabase();

  const [evaluation, setEvaluation] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({}); // criteria_id -> row
  const [weights, setWeights] = useState([]); // k_block weights for strategy
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session) { nav("/login"); return; }
      if (!organization) { nav("/org"); return; }
      if (!client) { nav("/settings"); return; }

      const { data: ev, error: evErr } = await client
        .from("evaluations")
        .select("id,title,strategy,created_at,supplier:suppliers(id,name)")
        .eq("id", id)
        .maybeSingle();

      if (evErr || !ev) { setErr(evErr?.message || "Beoordeling niet gevonden"); return; }
      setEvaluation(ev);

      const { data: c, error: cErr } = await client
        .from("criteria")
        .select("id,section,label,points_max")
        .order("section", { ascending: true })
        .order("label", { ascending: true });

      if (cErr) { setErr(cErr.message); return; }
      setCriteria(c || []);

      const { data: s, error: sErr } = await client
        .from("evaluation_scores")
        .select("id,criteria_id,rating,points,factor,score,source,motivation")
        .eq("evaluation_id", id);

      if (sErr) { setErr(sErr.message); return; }
      const map = {};
      for (const row of (s || [])) map[row.criteria_id] = row;
      setScores(map);

      const { data: w, error: wErr } = await client
        .from("weight_configs")
        .select("k_block,weight")
        .eq("strategy", ev.strategy);

      if (wErr) { setErr(wErr.message); return; }
      setWeights(w || []);
    }
    run();
  }, [id, session, organization, client, nav]);

  const weightByBlock = useMemo(() => {
    const m = {};
    for (const w of weights) m[w.k_block] = Number(w.weight) || 0;
    return m;
  }, [weights]);

  const sections = useMemo(() => {
    const by = {};
    for (const c of criteria) {
      const sec = c.section || "K1";
      by[sec] = by[sec] || [];
      by[sec].push(c);
    }
    return by;
  }, [criteria]);

  
useEffect(() => {
  // Default: open all sections on desktop, first two on mobile (we keep simple: open all once loaded)
  const keys = Object.keys(sections);
  if (!keys.length) return;
  setExpanded(prev => (Object.keys(prev).length ? prev : Object.fromEntries(keys.map(k => [k, true]))));
}, [sections]);

const totals = useMemo(() => {
    // naive total 0..100: for each section compute (sum score / sum max) *10 then weighted by normalized weights *10
    const blocks = Object.keys(sections).sort();
    const rawWeights = blocks.map(b => weightByBlock[b] ?? 0);
    const totalRaw = rawWeights.reduce((a,n)=>a+n,0) || 1;
    const norm = Object.fromEntries(blocks.map((b,i)=>[b, rawWeights[i]/totalRaw]));

    let total = 0;
    for (const b of blocks) {
      const cs = sections[b];
      let sum=0, max=0;
      for (const c of cs) {
        const row = scores[c.id];
        sum += Number(row?.score) || 0;
        max += Number(c.points_max) || 0;
      }
      const M = max ? (sum/max)*10 : 0;
      const O = M * (norm[b] || 0) * 10;
      total += O;
    }
    const stars = totalScoreToStars(total);
    return { total: Math.round(total*10)/10, stars, norm };
  }, [sections, scores, weightByBlock]);

  function updateLocal(criteriaId, patch) {
    setScores(prev => ({ ...prev, [criteriaId]: { ...(prev[criteriaId]||{}), ...patch } }));
  }

  async function saveCriteria(criteriaId) {
    setErr("");
    if (!client) return;

    const c = criteria.find(x=>x.id===criteriaId);
    const row = scores[criteriaId] || {};
    const rating = row.rating || "";
    const points = Number(row.points ?? c?.points_max ?? 10);
    const factor = ratingToFactor(rating);
    const score = points * factor;

    setSaving(true);
    const payload = {
      evaluation_id: id,
      criteria_id: criteriaId,
      rating,
      points,
      factor,
      score,
      source: row.source || null,
      motivation: row.motivation || null,
    };

    // upsert via unique (evaluation_id, criteria_id) recommended
    const { data, error } = await client
      .from("evaluation_scores")
      .upsert(payload, { onConflict: "evaluation_id,criteria_id" })
      .select("id,criteria_id,rating,points,factor,score,source,motivation")
      .single();

    if (error || !data) setErr(error?.message || "Opslaan mislukt: geen data teruggekregen (mogelijk RLS/policies of ontbrekende organisatie-koppeling).");
    else setScores(prev => ({ ...prev, [criteriaId]: data }));

    setSaving(false);
  }


async function saveAll() {
  setErr("");
  if (!client) return;
  setSavingAll(true);

  try {
    const payloads = [];
    for (const c of criteria) {
      const row = scores[c.id] || {};
      const rating = row.rating || "";
      if (!rating) continue; // skip empty
      const points = Number(row.points ?? c.points_max ?? 10);
      const factor = ratingToFactor(rating);
      const score = points * factor;
      payloads.push({
        evaluation_id: id,
        criteria_id: c.id,
        rating,
        points,
        factor,
        score,
        source: row.source || null,
        motivation: row.motivation || null,
      });
    }

    if (!payloads.length) {
      setErr("Geen ratings ingevuld om op te slaan.");
      return;
    }

    const { data, error } = await client
      .from("evaluation_scores")
      .upsert(payloads, { onConflict: "evaluation_id,criteria_id" })
      .select("id,criteria_id,rating,points,factor,score,source,motivation");

    if (error) throw error;
    const map = {};
    for (const row of (data || [])) map[row.criteria_id] = row;
    setScores(prev => ({ ...prev, ...map }));
  } catch (e) {
    setErr(e.message || String(e));
  } finally {
    setSavingAll(false);
  }
}

const progress = useMemo(() => {
  const total = criteria.length || 0;
  const filled = criteria.filter(c => (scores[c.id]?.rating)).length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return { total, filled, pct };
}, [criteria, scores]);

  if (!evaluation) {
    return <Notice title="Laden…">Even geduld.</Notice>;
  }

  return (
    <div className="space-y-4 pb-28">
      {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{evaluation.title || "Beoordeling"}</h1>
            <div className="mt-2 text-sm text-slate-600 flex gap-2 flex-wrap">
              <span className="badge">strategie: {evaluation.strategy}</span>
              <span className="badge">leverancier: {evaluation.supplier?.name}</span>
              <span className="badge">totaal: {totals.total} / 100 → {totals.stars}★</span>
            </div>
          </div>
          <button className="btn" onClick={()=>nav(-1)}>← Terug</button>
        </div>

        <Notice title="Tip (sneller werken)">
          Kies per criterium een rating. De factor + score worden automatisch berekend (Excel: Uitstekend=1, Goed=0.8, …).
          Klik daarna op <b>Opslaan</b> per criterium.
        </Notice>
      </div>

      <div className="grid gap-4">
        {Object.keys(sections).sort().map((sec) => (
          <div key={sec} className="section-card">
            
<button type="button" className="section-head w-full text-left" onClick={()=>setExpanded(prev=>({...prev,[sec]:!prev[sec]}))}>
  <div className="flex items-center gap-3 min-w-0">
    <h2 className="section-title">{sec}</h2>
    <span className="badge">{(totals.norm[sec] * 100).toFixed(0)}% weging</span>
    <span className="badge">raw {weightByBlock[sec] ?? 0}</span>
  </div>
  <div className="flex items-center gap-2 text-sm text-slate-600">
    <span className="badge">
      {sections[sec].filter(x => scores[x.id]?.rating).length}/{sections[sec].length} ingevuld
    </span>
    <span className="ml-1 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={"transition " + (expanded[sec] ? "rotate-180" : "")}>
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  </div>
</button>

            {expanded[sec] ? (
              <div className="px-5 pb-5 grid gap-4">
              {sections[sec].map((c) => {
                const row = scores[c.id] || {};
                return (
                  <div key={c.id} className="border border-slate-200 rounded-2xl p-4">
                    <div className="font-medium">{c.label}</div>

                    <div className="mt-3 grid md:grid-cols-5 gap-3 items-end">
                      <div className="space-y-1 md:col-span-1">
                        <label>Rating</label>
                        <select className="w-full" value={row.rating || ""} onChange={(e)=>updateLocal(c.id,{ rating: e.target.value })}>
                          <option value="">—</option>
                          {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-1">
                        <label>Punten</label>
                        <input className="w-full" type="number" step="1" min="0" value={row.points ?? c.points_max ?? 10}
                          onChange={(e)=>updateLocal(c.id,{ points: e.target.value })} />
                      </div>

                      <div className="space-y-1 md:col-span-1">
                        <label>Factor</label>
                        <input className="w-full" value={row.rating ? ratingToFactor(row.rating) : ""} readOnly />
                      </div>

                      <div className="space-y-1 md:col-span-1">
                        <label>Score</label>
                        <input className="w-full" value={row.rating ? (Number(row.points ?? c.points_max ?? 10) * ratingToFactor(row.rating)) : ""} readOnly />
                      </div>

                      <div className="md:col-span-1">
                        <button className="btn btn-primary w-full" disabled={saving} onClick={() => saveCriteria(c.id)}>
                          Opslaan
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label>Bron (optioneel)</label>
                        <input className="w-full" value={row.source || ""} onChange={(e)=>updateLocal(c.id,{ source: e.target.value })} placeholder="Bijv. ticket #, rapport, gesprek" />
                      </div>
                      <div className="space-y-1">
                        <label>Motivatie (optioneel)</label>
                        <input className="w-full" value={row.motivation || ""} onChange={(e)=>updateLocal(c.id,{ motivation: e.target.value })} placeholder="Korte toelichting" />
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            ) : null}
          </div>
        ))}
      </div>

<div className="sticky-bar">
  <div className="sticky-bar-inner">
    <div className="sticky-bar-card">
      <div className="min-w-0">
        <div className="font-semibold text-slate-900">
          Totaal: <span className="text-[#003A8F]">{totals.total}</span> / 100 · {totals.stars}★
        </div>
        <div className="text-xs text-slate-600 mt-0.5">
          Voortgang: {progress.filled}/{progress.total} criteria ({progress.pct}%)
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-primary" disabled={savingAll} onClick={saveAll}>
          {savingAll ? "Opslaan…" : "Opslaan alles"}
        </button>
        <button className="btn" onClick={()=>nav(-1)}>Terug</button>
      </div>
    </div>
  </div>
</div>
    </div>
  );
}
