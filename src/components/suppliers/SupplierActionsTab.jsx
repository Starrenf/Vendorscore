import { useEffect, useMemo, useState } from "react";
import Notice from "../Notice";
import { supabase } from "../../lib/supabase";

function emptyRow(organizationId, supplierId) {
  return {
    id: null,
    organization_id: organizationId,
    supplier_id: supplierId,
    contract_id: "",
    meeting_id: "",
    title: "",
    description: "",
    owner_name: "",
    due_date: "",
    status: "open",
    priority: "medium",
  };
}

export default function SupplierActionsTab({ supplier, organization }) {
  const client = supabase();
  const [rows, setRows] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    if (!client || !supplier?.id || !organization?.id) return;
    setLoading(true);
    setError("");
    const [actionsRes, contractRes, meetingRes] = await Promise.all([
      client
        .from("supplier_actions")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("supplier_id", supplier.id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      client
        .from("supplier_contracts")
        .select("id,title")
        .eq("organization_id", organization.id)
        .eq("supplier_id", supplier.id)
        .order("title"),
      client
        .from("supplier_meetings")
        .select("id,title,meeting_date")
        .eq("organization_id", organization.id)
        .eq("supplier_id", supplier.id)
        .order("meeting_date", { ascending: false, nullsFirst: false }),
    ]);

    if (actionsRes.error) setError(actionsRes.error.message);
    else setRows(actionsRes.data || []);
    setContracts(contractRes.data || []);
    setMeetings(meetingRes.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [supplier?.id, organization?.id]);

  const summary = useMemo(() => ({
    open: rows.filter((r) => (r.status || "open") !== "done").length,
    done: rows.filter((r) => r.status === "done").length,
  }), [rows]);

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
      contract_id: row.contract_id || null,
      meeting_id: row.meeting_id || null,
      title: row.title.trim(),
      description: row.description?.trim() || null,
      owner_name: row.owner_name?.trim() || null,
      due_date: row.due_date || null,
      status: row.status || "open",
      priority: row.priority || null,
      updated_at: new Date().toISOString(),
    };
    const query = row.id
      ? client.from("supplier_actions").update(payload).eq("id", row.id)
      : client.from("supplier_actions").insert(payload);
    const { error } = await query;
    if (error) { setError(error.message); return; }
    setMessage("Actie opgeslagen.");
    await load();
  }

  async function deleteRow(row) {
    if (!row?.id || !client) {
      setRows((prev) => prev.filter((x) => x !== row));
      return;
    }
    const ok = window.confirm(`Actie \"${row.title}\" verwijderen?`);
    if (!ok) return;
    const { error } = await client.from("supplier_actions").delete().eq("id", row.id);
    if (error) { setError(error.message); return; }
    setMessage("Actie verwijderd.");
    await load();
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Acties</h2>
          <p className="text-sm text-slate-600 mt-1">Borg opvolging met eigenaar, deadline, prioriteit en relatie naar contract of overleg.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="badge">Open: {summary.open}</span>
          <span className="badge">Afgerond: {summary.done}</span>
          <button className="btn btn-primary" onClick={addRow}>+ Actie</button>
        </div>
      </div>

      {error ? <Notice title="Fout" tone="danger">{error}</Notice> : null}
      {message ? <Notice title="" tone="success">{message}</Notice> : null}
      {loading ? <div className="text-sm text-slate-600">Acties laden…</div> : null}
      {rows.length === 0 ? <Notice title="Nog geen acties">Voeg acties toe vanuit contractreviews, overleggen of governancepunten.</Notice> : null}

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={row.id || `new-${idx}`} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="font-semibold">{row.title || `Nieuwe actie ${idx + 1}`}</div>
              <button className="btn" onClick={() => deleteRow(row)}>Verwijderen</button>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Titel *</label>
                <input className="w-full mt-1" value={row.title || ""} onChange={(e) => setField(idx, "title", e.target.value)} placeholder="Bijv. DPA laten beoordelen" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Eigenaar</label>
                <input className="w-full mt-1" value={row.owner_name || ""} onChange={(e) => setField(idx, "owner_name", e.target.value)} placeholder="Bijv. Frank Starren" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Deadline</label>
                <input type="date" className="w-full mt-1" value={row.due_date || ""} onChange={(e) => setField(idx, "due_date", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select className="w-full mt-1" value={row.status || "open"} onChange={(e) => setField(idx, "status", e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In uitvoering</option>
                  <option value="blocked">Geblokkeerd</option>
                  <option value="done">Afgerond</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Prioriteit</label>
                <select className="w-full mt-1" value={row.priority || "medium"} onChange={(e) => setField(idx, "priority", e.target.value)}>
                  <option value="low">Laag</option>
                  <option value="medium">Midden</option>
                  <option value="high">Hoog</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Gekoppeld contract</label>
                <select className="w-full mt-1" value={row.contract_id || ""} onChange={(e) => setField(idx, "contract_id", e.target.value)}>
                  <option value="">— geen —</option>
                  {contracts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Gekoppeld overleg</label>
                <select className="w-full mt-1" value={row.meeting_id || ""} onChange={(e) => setField(idx, "meeting_id", e.target.value)}>
                  <option value="">— geen —</option>
                  {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}{m.meeting_date ? ` (${m.meeting_date})` : ""}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Omschrijving</label>
                <textarea className="w-full mt-1 min-h-[100px]" value={row.description || ""} onChange={(e) => setField(idx, "description", e.target.value)} placeholder="Wat moet er gebeuren, waarom, en wat is de gewenste uitkomst?" />
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
