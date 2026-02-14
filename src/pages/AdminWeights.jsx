import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import { useToast } from "../components/ToastProvider";

const STRATEGIES = ["Strategisch","Knelpunt","Hefboom","Routine"];
const BLOCKS = ["K1","K2","K3","K4","K5"];

export default function AdminWeights() {
  
  const toast = useToast();
const { pathname } = useLocation();
  const adminTabs = useMemo(() => ([
    { to: "/admin/orgs", label: "Organisaties", active: pathname.startsWith("/admin/orgs") },
    { to: "/admin/weights", label: "Wegingen", active: pathname.startsWith("/admin/weights") },
  ]), [pathname]);
  const { session, organization } = useApp();
  const client = supabase();

  const [rows, setRows] = useState([]);
  const [strategy, setStrategy] = useState("Strategisch");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session) return;
      if (!organization) return;
      if (!client) return;

      const { data, error } = await client
        .from("weight_configs")
        .select("id,strategy,k_block,weight,method")
        .order("strategy", { ascending: true })
        .order("k_block", { ascending: true });

      if (error) {
        setErr(error.message);
        toast.error(error?.message || "Onbekende fout");
      } else {
        setRows(data || []);
      }
}
    run();
  }, [session, organization, client]);

  const current = useMemo(() => {
    const m = {};
    for (const b of BLOCKS) m[b] = 0;
    for (const r of rows.filter(r => r.strategy === strategy)) m[r.k_block] = Number(r.weight) || 0;
    return m;
  }, [rows, strategy]);

  function updateBlock(k, val) {
    const n = Number(val);
    setRows(prev => {
      // update in memory only; persist on saveAll
      const copy = prev.map(x => ({...x}));
      const idx = copy.findIndex(x => x.strategy === strategy && x.k_block === k);
      if (idx >= 0) copy[idx].weight = isFinite(n) ? n : 0;
      return copy;
    });
  }

  async function saveAll() {
    setErr("");
    if (!client || !organization) return;
    setSaving(true);

    const payload = BLOCKS.map((b) => {
      const existing = rows.find(r => r.strategy === strategy && r.k_block === b);
      return {
        id: existing?.id,
        organization_id: organization.id,
        strategy,
        k_block: b,
        weight: Number(current[b] || 0),
        method: "Excel",
      };
    });

    const { data, error } = await client
      .from("weight_configs")
      .upsert(payload, { onConflict: "organization_id,strategy,k_block" })
      .select("id");

    if (error || !data || (Array.isArray(data) && data.length === 0)) setErr(error?.message || "Opslaan mislukt: geen rijen opgeslagen (mogelijk RLS/policies of ontbrekende organisatie-koppeling).");

    setSaving(false);
  }

  return (
    <div className="space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-slate-600 text-sm">Beheer organisaties en wegingsconfiguratie.</p>
      </div>
      <div className="flex gap-2">
        {adminTabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={[
              "px-3 py-2 rounded-lg text-sm font-medium border",
              t.active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
      <div className="card p-6">
        <h2 className="text-xl font-semibold">Wegingen</h2>
        <p className="text-sm text-slate-600 mt-1">
          Pas de wegingsmatrix aan per leveranciersstrategie. (Later kunnen we hier rechten op zetten.)
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        <div className="mt-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label>Strategie</label>
            <select value={strategy} onChange={(e)=>setStrategy(e.target.value)}>
              {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>

        <div className="mt-4 grid md:grid-cols-5 gap-3">
          {BLOCKS.map((b) => (
            <div key={b} className="card p-4">
              <div className="font-semibold">{b}</div>
              <div className="mt-2">
                <label className="sr-only">Weight</label>
                <input type="number" step="1" min="0" max="20" value={current[b]} onChange={(e)=>updateBlock(b, e.target.value)} className="w-full" />
              </div>
              <div className="mt-2 text-xs text-slate-600">0–20 (Excel)</div>
            </div>
          ))}
        </div>

        <Notice title="Join via slug">
          Deel met nieuwe collega’s een link: <span className="font-mono">/join/&lt;slug&gt;</span> zodat ze automatisch membership krijgen.
        </Notice>
      </div>
    </div>
  );
}
