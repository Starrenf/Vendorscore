import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

const STRATEGIES = ["Strategisch","Knelpunt","Hefboom","Routine"];

export default function NewEvaluation() {
  const nav = useNavigate();
  const { session, organization } = useApp();
  const client = supabase();

  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [strategy, setStrategy] = useState("Strategisch");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function run() {
      if (!session) { nav("/login"); return; }
      if (!organization) { nav("/org"); return; }
      if (!client) { nav("/settings"); return; }

      const { data, error } = await client
        .from("suppliers")
        .select("id,name")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) setErr(error.message);
      setSuppliers(data || []);
    }
    run();
  }, [session, organization, client, nav]);

  const supplierName = useMemo(() => suppliers.find(s => s.id === supplierId)?.name, [suppliers, supplierId]);

  async function create(e) {
    e.preventDefault();
    setErr("");
    if (!supplierId) { setErr("Kies eerst een leverancier."); return; }

    setBusy(true);
    const { data, error } = await client
      .from("evaluations")
      .insert({
        organization_id: organization.id,
        supplier_id: supplierId,
        strategy,
        title: title.trim() || `Beoordeling – ${supplierName ?? "leverancier"}`,
      })
      .select("id")
      .single();

    if (error) setErr(error.message);
    else nav(`/evaluations/${data.id}`);

    setBusy(false);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Nieuwe beoordeling</h1>
        <p className="text-sm text-slate-600 mt-1">
          Maak een nieuwe beoordeling aan. Daarna kun je scores per criterium invullen.
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        <form className="mt-4 grid gap-4" onSubmit={create}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Leverancier</label>
              <select className="w-full" value={supplierId} onChange={(e)=>setSupplierId(e.target.value)} required>
                <option value="">— kies —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label>Leveranciersstrategie</label>
              <select className="w-full" value={strategy} onChange={(e)=>setStrategy(e.target.value)}>
                {STRATEGIES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label>Titel (optioneel)</label>
            <input className="w-full" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Bijv. kwartaal-evaluatie Q1" />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Aanmaken…" : "Aanmaken"}</button>
            <button className="btn" type="button" onClick={()=>nav(-1)}>Annuleren</button>
          </div>
        </form>
      </div>
    </div>
  );
}
