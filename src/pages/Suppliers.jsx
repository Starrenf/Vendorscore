import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

export default function Suppliers() {
  const nav = useNavigate();
  const { session, organization } = useApp();
  const client = supabase();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session) { nav("/login"); return; }
      if (!organization) { nav("/org"); return; }
      if (!client) { nav("/settings"); return; }

      setLoading(true);
      const { data, error } = await client
        .from("suppliers")
        .select("id,name,is_active,created_at")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true });

      if (error) setErr(error.message);
      setRows(data || []);
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
      .select("id,name,is_active,created_at")
      .single();

    if (error) setErr(error.message);
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
