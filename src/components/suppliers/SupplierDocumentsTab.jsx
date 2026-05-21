import { useEffect, useState } from "react";
import Notice from "../Notice";
import { supabase } from "../../lib/supabase";

function emptyRow(organizationId, supplierId) {
  return {
    id: null,
    organization_id: organizationId,
    supplier_id: supplierId,
    title: "",
    document_type: "",
    document_url: "",
    source_system: "Teams/SharePoint",
    folder_path: "",
    notes: "",
  };
}

export default function SupplierDocumentsTab({ supplier, organization }) {
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
      .from("supplier_documents")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("supplier_id", supplier.id)
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
      title: row.title.trim(),
      document_type: row.document_type?.trim() || null,
      document_url: row.document_url?.trim() || null,
      source_system: row.source_system?.trim() || null,
      folder_path: row.folder_path?.trim() || null,
      notes: row.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const query = row.id
      ? client.from("supplier_documents").update(payload).eq("id", row.id)
      : client.from("supplier_documents").insert(payload);
    const { error } = await query;
    if (error) { setError(error.message); return; }
    setMessage("Document opgeslagen.");
    await load();
  }

  async function deleteRow(row) {
    if (!row?.id || !client) {
      setRows((prev) => prev.filter((x) => x !== row));
      return;
    }
    const ok = window.confirm(`Document \"${row.title}\" verwijderen?`);
    if (!ok) return;
    const { error } = await client.from("supplier_documents").delete().eq("id", row.id);
    if (error) { setError(error.message); return; }
    setMessage("Document verwijderd.");
    await load();
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Documenten</h2>
          <p className="text-sm text-slate-600 mt-1">
            Leg documenttypes vast zoals SLA, DPA, DAB, contractsamenvatting of notitie en verwijs naar de bron in Teams of SharePoint.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addRow}>+ Document</button>
      </div>

      {error ? <Notice title="Fout" tone="danger">{error}</Notice> : null}
      {message ? <Notice title="" tone="success">{message}</Notice> : null}
      {loading ? <div className="text-sm text-slate-600">Documenten laden…</div> : null}

      {rows.length === 0 ? (
        <Notice title="Nog geen documenten">Voeg documenten toe en gebruik links naar Teams/SharePoint als bronverwijzing.</Notice>
      ) : null}

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={row.id || `new-${idx}`} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="font-semibold">{row.title || `Nieuw document ${idx + 1}`}</div>
              <button className="btn" onClick={() => deleteRow(row)}>Verwijderen</button>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Titel *</label>
                <input className="w-full mt-1" value={row.title || ""} onChange={(e) => setField(idx, "title", e.target.value)} placeholder="Bijv. DPA Microsoft 2026" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Documenttype</label>
                <input className="w-full mt-1" value={row.document_type || ""} onChange={(e) => setField(idx, "document_type", e.target.value)} placeholder="Bijv. DPA, SLA, DAB, samenvatting" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Bronsysteem</label>
                <input className="w-full mt-1" value={row.source_system || ""} onChange={(e) => setField(idx, "source_system", e.target.value)} placeholder="Teams/SharePoint" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Map / pad</label>
                <input className="w-full mt-1" value={row.folder_path || ""} onChange={(e) => setField(idx, "folder_path", e.target.value)} placeholder="Bijv. Leveranciers/Microsoft/Contracten" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Document URL</label>
                <input className="w-full mt-1" value={row.document_url || ""} onChange={(e) => setField(idx, "document_url", e.target.value)} placeholder="https://..." />
                {row.document_url ? (
                  <a className="text-xs text-blue-700 underline mt-1 inline-block" href={row.document_url} target="_blank" rel="noreferrer">Open link</a>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notities</label>
                <textarea className="w-full mt-1 min-h-[100px]" value={row.notes || ""} onChange={(e) => setField(idx, "notes", e.target.value)} placeholder="Bijv. laatste versie, ontbrekende bijlage, beoordelen door FG/juridische zaken…" />
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
