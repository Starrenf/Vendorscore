import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";

function StrategyBadge({ value }) {
  const s = (value || "").toLowerCase();
  const map = {
    "strategische leverancier": "bg-red-50 text-red-700 border-red-200",
    strategisch: "bg-red-50 text-red-700 border-red-200",
    knelpunt: "bg-amber-50 text-amber-800 border-amber-200",
    hefboom: "bg-sky-50 text-sky-800 border-sky-200",
    routine: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };
  const cls = map[s] || "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={"inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border " + cls}>
      {value || "—"}
    </span>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-16 mx-auto max-w-3xl px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
            <div className="font-semibold">{title}</div>
            <button className="btn" onClick={onClose}>Sluiten</button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">
        {label}{required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function cleanUpdate(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export default function SupplierDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { session, organization } = useApp();
  const client = supabase();

  const [tab, setTab] = useState("gegevens");
  const [supplier, setSupplier] = useState(null);
  const [draft, setDraft] = useState({
    name: "",
    kvk_number: "",
    classification: "",
    creditor_number: "",
    notes: "",
    contacts: [],
  });
  const [evals, setEvals] = useState([]);
  const [err, setErr] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    async function run() {
      setErr("");
      setSaveMsg("");
      if (!session) { nav("/login"); return; }
      if (!organization) { nav("/org"); return; }
      if (!client) { nav("/settings"); return; }

      const { data: s, error: sErr } = await client
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (sErr) { setErr(sErr.message); return; }
      if (!s) { setErr("Leverancier niet gevonden binnen deze organisatie."); return; }

      setSupplier(s);
      setDraft({
        name: s.name ?? "",
        kvk_number: s.kvk_number ?? "",
        classification: s.classification ?? "",
        creditor_number: s.creditor_number ?? "",
        notes: s.notes ?? "",
        // contacts is optional; support both 'contacts' and legacy 'contactpersons'
        contacts: Array.isArray(s.contacts)
          ? s.contacts
          : Array.isArray(s.contactpersons)
            ? s.contactpersons
            : [],
      });

      const { data: e, error: eErr } = await client
        .from("evaluations")
        .select("id,title,strategy,created_at")
        .eq("supplier_id", id)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (eErr) setErr(eErr.message);
      setEvals(e || []);
    }
    run();
  }, [id, session, organization, client, nav]);

  const lastEval = useMemo(() => (evals && evals.length ? evals[0] : null), [evals]);
  const activePill = supplier?.is_active === false ? "inactief" : "actief";

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function updateContact(idx, patch) {
    setDraft((d) => {
      const next = [...(d.contacts || [])];
      next[idx] = { ...(next[idx] || {}), ...patch };
      return { ...d, contacts: next };
    });
  }

  function addContact() {
    setDraft((d) => ({
      ...d,
      contacts: [...(d.contacts || []), { name: "", role: "", email: "", phone: "" }],
    }));
  }

  function removeContact(idx) {
    setDraft((d) => {
      const next = [...(d.contacts || [])];
      next.splice(idx, 1);
      return { ...d, contacts: next };
    });
  }

  async function save() {
    setErr("");
    setSaveMsg("");
    const n = (draft.name || "").trim();
    const kvk = (draft.kvk_number || "").trim();

    if (!n) { setErr("Naam organisatie is verplicht."); return; }
    if (!kvk) { setErr("KVK-nummer is verplicht."); return; }

    setSaving(true);

    const payload = cleanUpdate({
      name: n,
      kvk_number: kvk,
      classification: (draft.classification || "").trim() || null,
      creditor_number: (draft.creditor_number || "").trim() || null,
      notes: (draft.notes || "").trim() || null,
      contacts: Array.isArray(draft.contacts) ? draft.contacts : [],
    });

    const { data, error } = await client
      .from("suppliers")
      .update(payload)
      .eq("id", id)
      .eq("organization_id", organization.id)
      .select("*")
      .maybeSingle();

    if (error) {
      const msg = String(error.message || error);
      // Helpful message if the DB schema does not yet contain these columns.
      if (msg.toLowerCase().includes("column") && msg.toLowerCase().includes("does not exist")) {
        setErr(
          "De database mist (nog) één of meer velden voor leveranciersregistratie (bijv. kvk_number, classification, creditor_number, notes, contacts). " +
          "Voeg deze kolommen toe in Supabase (suppliers) of laat me het SQL-migratiescript maken.\n\nOriginele fout: " + msg
        );
      } else {
        setErr(msg);
      }
    } else {
      setSupplier(data || supplier);
      setSaveMsg("Opgeslagen ✅");
    }

    setSaving(false);
  }

  const tabs = [
    { key: "gegevens", label: "Gegevens" },
    { key: "contactpersonen", label: "Contactpersonen" },
    { key: "contracten", label: "Contracten", disabled: true },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        <Link className="underline" to="/suppliers">Leveranciers</Link> <span className="text-slate-400">›</span> {supplier?.name || "…"}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold truncate">{supplier?.name ?? "Leverancier"}</h1>
              <span className="badge">{activePill}</span>
              {draft?.classification ? <StrategyBadge value={draft.classification} /> : null}
              {lastEval?.strategy ? <StrategyBadge value={lastEval.strategy} /> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="badge">id: {id}</span>
              <span className="badge">beoordelingen: {evals.length}</span>
              {supplier?.created_at ? <span className="badge">aangemaakt: {new Date(supplier.created_at).toLocaleDateString("nl-NL")}</span> : null}
              <span className="badge">org: {organization?.name}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => setInfoOpen(true)}>ℹ️ Uitleg classificatie</button>
            <Link className="btn" to="/methodiek">Methodiek</Link>
            <Link className="btn btn-primary" to="/evaluations/new">Nieuwe beoordeling</Link>
          </div>
        </div>

        <div className="grid md:grid-cols-[240px_1fr]">
          {/* Left tabs */}
          <aside className="bg-slate-900 text-white/90 p-4">
            <div className="text-xs uppercase tracking-wider text-white/60 mb-3">Menu</div>
            <nav className="space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  disabled={t.disabled}
                  onClick={() => setTab(t.key)}
                  className={
                    "w-full text-left px-3 py-2 rounded-lg transition " +
                    (t.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : tab === t.key
                        ? "bg-white/15"
                        : "hover:bg-white/10")
                  }
                >
                  {t.label}
                  {t.disabled ? <span className="ml-2 text-xs text-white/60">(niet in scope)</span> : null}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="p-5">
            {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}
            {saveMsg ? <Notice title="" tone="success">{saveMsg}</Notice> : null}

            {tab === "gegevens" ? (
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold">Gegevens</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Deze velden zijn bedoeld voor professionele leveranciersregistratie. Contracten zijn (voorlopig) buiten scope.
                </p>

                <div className="mt-4 space-y-4">
                  <Field label="Naam Organisatie" required>
                    <input value={draft.name} onChange={(e) => setField("name", e.target.value)} className="w-full" placeholder="Bijv. Topicus" />
                  </Field>

                  <Field label="KVK-nummer" required hint="Alleen cijfers (bijv. 74338269).">
                    <input value={draft.kvk_number} onChange={(e) => setField("kvk_number", e.target.value)} className="w-full" placeholder="KVK" />
                  </Field>

                  <Field
                    label={
                      <span className="inline-flex items-center gap-2">
                        Classificatie <button className="btn" type="button" onClick={() => setInfoOpen(true)}>ℹ️</button>
                      </span>
                    }
                    hint="Kies de leveranciersclassificatie (Kraljic) die bij deze leverancier past."
                  >
                    <select value={draft.classification} onChange={(e) => setField("classification", e.target.value)} className="w-full">
                      <option value="">— kies —</option>
                      <option value="Strategische leverancier">Strategische leverancier</option>
                      <option value="Knelpunt leverancier">Knelpunt leverancier</option>
                      <option value="Hefboom leverancier">Hefboom leverancier</option>
                      <option value="Routine leverancier">Routine leverancier</option>
                    </select>
                  </Field>

                  <Field label="Crediteurnummer">
                    <input value={draft.creditor_number} onChange={(e) => setField("creditor_number", e.target.value)} className="w-full" placeholder="Bijv. 74343424" />
                  </Field>

                  <Field label="Opmerkingen">
                    <textarea value={draft.notes} onChange={(e) => setField("notes", e.target.value)} className="w-full min-h-[120px]" placeholder="Korte opmerkingen, aandachtspunten, risico's…" />
                  </Field>

                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                      {saving ? "Opslaan…" : "Opslaan"}
                    </button>
                    <Link className="btn" to="/suppliers">Terug</Link>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "contactpersonen" ? (
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Contactpersonen</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Voeg contactpersonen toe voor deze leverancier. (Contracten zijn nog niet in scope.)
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={addContact}>+ Contactpersoon</button>
                </div>

                <div className="mt-4 space-y-3">
                  {(draft.contacts || []).length === 0 ? (
                    <Notice title="Nog geen contactpersonen">Klik op “+ Contactpersoon” om er één toe te voegen.</Notice>
                  ) : null}

                  {(draft.contacts || []).map((c, idx) => (
                    <div key={idx} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold">Contactpersoon {idx + 1}</div>
                        <button className="btn" onClick={() => removeContact(idx)}>Verwijderen</button>
                      </div>

                      <div className="mt-3 grid md:grid-cols-2 gap-3">
                        <Field label="Naam" required>
                          <input value={c.name || ""} onChange={(e) => updateContact(idx, { name: e.target.value })} className="w-full" placeholder="Naam" />
                        </Field>

                        <Field label="Rol / functie">
                          <input value={c.role || ""} onChange={(e) => updateContact(idx, { role: e.target.value })} className="w-full" placeholder="Bijv. Accountmanager" />
                        </Field>

                        <Field label="E-mail">
                          <input value={c.email || ""} onChange={(e) => updateContact(idx, { email: e.target.value })} className="w-full" placeholder="naam@leverancier.nl" />
                        </Field>

                        <Field label="Telefoon">
                          <input value={c.phone || ""} onChange={(e) => updateContact(idx, { phone: e.target.value })} className="w-full" placeholder="+31 …" />
                        </Field>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                      {saving ? "Opslaan…" : "Opslaan"}
                    </button>
                    <Link className="btn" to="/suppliers">Terug</Link>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "contracten" ? (
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold">Contracten</h2>
                <Notice title="Nog niet in scope">
                  Contractregistratie volgt later. Voor nu richten we ons op leveranciersregistratie + contactpersonen.
                </Notice>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Evaluations remain visible as a separate section (useful for demo) */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Beoordelingen</h2>
          <Link className="btn" to="/evaluations/new">+ Nieuwe beoordeling</Link>
        </div>

        <div className="mt-3 grid gap-3">
          {evals.length === 0 ? (
            <Notice title="Nog geen beoordelingen">Maak de eerste beoordeling aan.</Notice>
          ) : null}

          {evals.map((e) => (
            <Link
              key={e.id}
              className="card p-4 hover:bg-slate-50 no-underline transition border border-slate-200 hover:border-slate-300"
              to={`/evaluations/${e.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="font-semibold">{e.title || "Beoordeling"}</div>
                <div className="text-sm text-slate-600">{new Date(e.created_at).toLocaleString("nl-NL")}</div>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap text-sm text-slate-600">
                <span className="badge">status: concept</span>
                <StrategyBadge value={e.strategy || "—"} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Modal open={infoOpen} title="Classificatie (Kraljic) – korte uitleg" onClose={() => setInfoOpen(false)}>
        <div className="space-y-3 text-sm text-slate-700">
          <p className="text-slate-600">
            Classificatie helpt om de juiste focus te kiezen in leveranciersmanagement. Dit sluit aan op het Kraljic-model.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold">Strategische leverancier</div>
                <StrategyBadge value="Strategisch" />
              </div>
              <p className="mt-2 text-slate-600">Hoog belang & hoog risico. Focus op samenwerking, governance en continuïteit.</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold">Knelpunt leverancier</div>
                <StrategyBadge value="Knelpunt" />
              </div>
              <p className="mt-2 text-slate-600">Hoog risico. Focus op leveringszekerheid en mitigatie (alternatieven/exit).</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold">Hefboom leverancier</div>
                <StrategyBadge value="Hefboom" />
              </div>
              <p className="mt-2 text-slate-600">Hoge impact, laag risico. Focus op kosten, contract en prestatiesturing.</p>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold">Routine leverancier</div>
                <StrategyBadge value="Routine" />
              </div>
              <p className="mt-2 text-slate-600">Laag belang & laag risico. Focus op efficiëntie en minimale beheerlast.</p>
            </div>
          </div>

          <div className="pt-2">
            <Link className="btn btn-primary" to="/methodiek" onClick={() => setInfoOpen(false)}>Lees de volledige methodiek</Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
