import { useEffect, useState } from "react";
import Notice from "../Notice";
import { supabase } from "../../lib/supabase";

function emptyRow(organizationId, supplierId) {
  return {
    id: null,
    organization_id: organizationId,
    supplier_id: supplierId,
    meeting_date: "",
    title: "",
    participants: "",
    summary: "",
    notes: "",
    follow_up: "",
  };
}

export default function SupplierMeetingsTab({ supplier, organization }) {
  const client = supabase();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    if (!client || !supplier?.id || !organization?.id) return;
    setLoading(true);
    setError("");
    const { data, error } = await client
      .from("supplier_meetings")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("supplier_id", supplier.id)
      .order("meeting_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [supplier?.id, organization?.id]);

  function setField(idx, key, value) {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  }

  function addRow() { setRows((prev) => [emptyRow(organization?.id, supplier?.id), ...prev]); }

  async function saveRow(row) {
    setError("");
    setMessage("");
    if (!client) return;
    if (!row.title?.trim()) { setError("Titel is verplicht."); return; }
    const payload = {
      organization_id: organization.id,
      supplier_id: supplier.id,
      meeting_date: row.meeting_date || null,
      title: row.title.trim(),
      participants: row.participants?.trim() || null,
      summary: row.summary?.trim() || null,
      notes: row.notes?.trim() || null,
      follow_up: row.follow_up?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const query = row.id
      ? client.from("supplier_meetings").update(payload).eq("id", row.id)
      : client.from("supplier_meetings").insert(payload);
    const { error } = await query;
    if (error) { setError(error.message); return; }
    setMessage("Overleg opgeslagen.");
    await load();
  }

  async function deleteRow(row) {
    if (!row?.id || !client) {
      setRows((prev) => prev.filter((x) => x !== row));
      return;
    }
    const ok = window.confirm(`Overleg \"${row.title}\" verwijderen?`);
    if (!ok) return;
    const { error } = await client.from("supplier_meetings").delete().eq("id", row.id);
    if (error) { setError(error.message); return; }
    setMessage("Overleg verwijderd.");
    await load();
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Overleggen</h2>
          <p className="text-sm text-slate-600 mt-1">
            Leg leveranciersoverleggen vast inclusief samenvatting, deelnemers en follow-up.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addRow}>+ Overleg</button>
      </div>

      {error ? <Notice title="Fout" tone="danger">{error}</Notice> : null}
      {message ? <Notice title="" tone="success">{message}</Notice> : null}
      {loading ? <div className="text-sm text-slate-600">Overleggen laden…</div> : null}

      {rows.length === 0 ? <Notice title="Nog geen overleggen">Voeg een overleg toe om besluiten en acties te borgen.</Notice> : null}

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={row.id || `new-${idx}`} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="font-semibold">{row.title || `Nieuw overleg ${idx + 1}`}</div>
              <button className="btn" onClick={() => deleteRow(row)}>Verwijderen</button>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Titel *</label>
                <input className="w-full mt-1" value={row.title || ""} onChange={(e) => setField(idx, "title", e.target.value)} placeholder="Bijv. Kwartaaloverleg Q2" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Datum</label>
                <input type="date" className="w-full mt-1" value={row.meeting_date || ""} onChange={(e) => setField(idx, "meeting_date", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Deelnemers</label>
                <input className="w-full mt-1" value={row.participants || ""} onChange={(e) => setField(idx, "participants", e.target.value)} placeholder="Bijv. Frank Starren, accountmanager leverancier" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Samenvatting</label>
                <textarea className="w-full mt-1 min-h-[100px]" value={row.summary || ""} onChange={(e) => setField(idx, "summary", e.target.value)} placeholder="Belangrijkste besproken punten…" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notities</label>
                <textarea className="w-full mt-1 min-h-[90px]" value={row.notes || ""} onChange={(e) => setField(idx, "notes", e.target.value)} placeholder="Context, signalen, beslissingen…" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Follow-up</label>
                <textarea className="w-full mt-1 min-h-[90px]" value={row.follow_up || ""} onChange={(e) => setField(idx, "follow_up", e.target.value)} placeholder="Afgesproken vervolgstappen…" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => saveRow(row)}>Opslaan</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
