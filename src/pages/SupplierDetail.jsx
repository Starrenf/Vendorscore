import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import { normalizeKvk } from "../lib/kvk";
import { normalizeClassification } from "../lib/normalizeClassification";
import { useToast } from "../components/ToastProvider";

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

function formatSbError(e) {
  if (!e) return "Onbekende fout";
  if (typeof e === "string") return e;
  const parts = [];
  if (e.message) parts.push(e.message);
  if (e.details) parts.push(e.details);
  if (e.hint) parts.push(e.hint);
  if (e.code) parts.push(`(${e.code})`);
  return parts.filter(Boolean).join(" ");
}

const classificationLabel = (v) => {
  if (!v) return "Niet geclassificeerd";
  return v;
};

const classificationHelp =
  "Kraljic-classificatie: Strategisch (hoog risico/hoog impact), Knelpunt (hoog risico/laag impact), Hefboom (laag risico/hoog impact), Routine (laag risico/laag impact).";

export default function SupplierDetail() {
  
  const toast = useToast();
  const [showClassHelp, setShowClassHelp] = useState(false);
const { id } = useParams();
  const nav = useNavigate();
  const { session, organization } = useApp();
  const client = supabase();

  const [tab, setTab] = useState("gegevens");
  const [supplier, setSupplier] = useState(null);
  const [draft, setDraft] = useState({
    name: "",
    kvk_number: "",
    classification: ("") || "",
    creditor_number: "",
    notes: "",
  });
  const [contacts, setContacts] = useState([]);
  const [deletedContactIds, setDeletedContactIds] = useState([]);
  const [evals, setEvals] = useState([]);
  const [err, setErr] = useState("");
  
  const [msg, setMsg] = useState(null);
const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    async function run() {
      setErr("");
      toast.error(String(err?.message || err || "Onbekende fout"));
setMsg(null);

      setSaveMsg("");
      if (!session) { nav("/login"); return; }
      if (!organization) { nav("/org"); return; }
      if (!client) { nav("/settings"); return; }

      const { data: s, error: sErr } = await client
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (sErr) { setErr(sErr.message);
      toast.error(String(err?.message || err || "Onbekende fout"));
return; }
      if (!s) { setErr("Leverancier niet gevonden binnen deze organisatie.");
      toast.error(String(err?.message || err || "Onbekende fout"));
return; }

      setSupplier(s);
      
      setMsg("✅ Opgeslagen");
      toast.success("Wijzigingen zijn opgeslagen.");
setDraft({
        name: s.name ?? "",
        kvk_number: s.kvk_number ?? "",
        classification: s.classification ?? "",
        creditor_number: s.creditor_number ?? "",
        notes: s.notes ?? "",
      });

      // Load contacts from supplier_contacts table
      const { data: c, error: cErr } = await client
        .from("supplier_contacts")
        .select("id,full_name,role_title,email,phone,is_primary,created_at")
        .eq("supplier_id", id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (cErr) setErr(cErr.message);
      toast.error(String(err?.message || err || "Onbekende fout"));
setMsg(null);

      setContacts((c || []).map((x) => ({
        id: x.id,
        name: x.full_name || "",
        role: x.role_title || "",
        email: x.email || "",
        phone: x.phone || "",
        is_primary: !!x.is_primary,
      })));
      setDeletedContactIds([]);

      const { data: e, error: eErr } = await client
        .from("evaluations")
        .select("id,title,strategy,created_at")
        .eq("supplier_id", id)
        .order("created_at", { ascending: false });

      if (eErr) setErr(eErr.message);
      toast.error(String(err?.message || err || "Onbekende fout"));
setMsg(null);

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
    setContacts((arr) => {
      const next = [...arr];
      next[idx] = { ...(next[idx] || {}), ...patch };
      return next;
    });
  }

  function addContact() {
    setContacts((arr) => [...arr, { id: null, name: "", role: "", email: "", phone: "", is_primary: false }]);
  }

  function removeContact(idx) {
    setContacts((arr) => {
      const next = [...arr];
      const removed = next[idx];
      if (removed?.id) setDeletedContactIds((ids) => [...ids, removed.id]);
      next.splice(idx, 1);
      return next;
    });
  }


  async function save() {
    setErr("");
      toast.error(String(err?.message || err || "Onbekende fout"));
setMsg(null);

    setSaveMsg("");

    // Zonder organisatie-koppeling (join) blokkeert RLS alle reads/writes.
    // Dit is de meest voorkomende oorzaak dat nieuwe collega's niets kunnen zien/opslaan.
    if (!organization?.id) {
      setErr(
        "Je account is nog niet gekoppeld aan een organisatie. Ga naar 'Onboarding' en join eerst een organisatie (via slug/invite)."
      );
      return;
    }

    if (!client) {
      setErr("Supabase is nog niet geconfigureerd. Ga naar 'Runtime config' en vul de keys in.");
      toast.error(String(err?.message || err || "Onbekende fout"));
setMsg(null);

      return;
    }
    const n = (draft.name || "").trim();
    const kvk = normalizeKvk(draft.kvk_number);

    if (!n) { setErr("Naam organisatie is verplicht.");
      toast.error(String(err?.message || err || "Onbekende fout"));
return; }
    if (!kvk) { setErr("KVK-nummer is verplicht (8 cijfers)." ); return; }
    if (kvk.length !== 8) { setErr("KVK-nummer moet uit precies 8 cijfers bestaan.");
      toast.error(String(err?.message || err || "Onbekende fout"));
return; }

    setSaving(true);

    try {
      // 1) Save supplier fields
      const payload = cleanUpdate({
        name: n,
        kvk_number: kvk,
        classification: normalizeClassification(normalizeClassification((draft.classification || "").trim() || null)),
        creditor_number: (draft.creditor_number || "").trim() || null,
        notes: (draft.notes || "").trim() || null,
        organization_id: organization?.id ?? null,
        updated_at: new Date().toISOString(),
      });

      const { data, error } = await client
        .from("suppliers")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        const msg = formatSbError(error);
        const lower = msg.toLowerCase();
        if (lower.includes("column") && lower.includes("does not exist")) {
          throw new Error(
            "De database mist (nog) één of meer velden voor leveranciersregistratie (bijv. kvk_number, classification, creditor_number, notes). " +
              "Voeg deze kolommen toe in Supabase (suppliers) of gebruik het SQL-migratiescript.\n\nOriginele fout: " + msg
          );
        }
        throw new Error(msg);
      }

      if (!data) {
        throw new Error("Opslaan mislukt: leverancier kon niet worden bijgewerkt (geen data terug). Controleer RLS/policies en organization_id.");
      }

      if (data) {
        setSupplier(data);
        setDraft({
          name: data.name ?? "",
          kvk_number: data.kvk_number ?? "",
          classification: data.classification ?? "",
          creditor_number: data.creditor_number ?? "",
          notes: data.notes ?? "",
        });
      } else {
        setSupplier(supplier);
      }

      // 2) Sync contactpersonen (supplier_contacts)
      const cleaned = (contacts || [])
        .map((c) => ({
          id: c.id || null,
          name: (c.name || "").trim(),
          role: (c.role || "").trim(),
          email: (c.email || "").trim(),
          phone: (c.phone || "").trim(),
          is_primary: !!c.is_primary,
        }))
        .filter((c) => c.name); // only keep rows with a name

      // ensure at most 1 primary
      let hasPrimary = false;
      const normalized = cleaned.map((c) => {
        const next = { ...c, is_primary: c.is_primary && !hasPrimary };
        if (next.is_primary) hasPrimary = true;
        return next;
      });

      // delete removed contacts
      const uniqueDelete = Array.from(new Set(deletedContactIds || []));
      if (uniqueDelete.length) {
        const { error: delErr } = await client
          .from("supplier_contacts")
          .delete()
          .in("id", uniqueDelete)
        if (delErr) throw delErr;
      }

      // upsert existing
      const existing = normalized.filter((c) => c.id);
      if (existing.length) {
        const rows = existing.map((c) => ({
          id: c.id,
          organization_id: organization.id, // explicit for RLS
          supplier_id: id,
          full_name: c.name,
          role_title: c.role || null,
          email: c.email || null,
          phone: c.phone || null,
          is_primary: c.is_primary,
        }));
        const { error: upErr } = await client
          .from("supplier_contacts")
          .upsert(rows, { onConflict: "id" });
        if (upErr) throw upErr;
      }

      // insert new
      const toInsert = normalized.filter((c) => !c.id);
      if (toInsert.length) {
        const rows = toInsert.map((c) => ({
          organization_id: organization.id, // explicit for RLS
          supplier_id: id,
          full_name: c.name,
          role_title: c.role || null,
          email: c.email || null,
          phone: c.phone || null,
          is_primary: c.is_primary,
        }));
        const { error: insErr } = await client
          .from("supplier_contacts")
          .insert(rows);
        if (insErr) throw insErr;
      }

      // refresh contacts from DB (source of truth)
      const { data: c2, error: c2Err } = await client
        .from("supplier_contacts")
        .select("id,full_name,role_title,email,phone,is_primary,created_at")
        .eq("supplier_id", id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (c2Err) throw c2Err;

      setContacts((c2 || []).map((x) => ({
        id: x.id,
        name: x.full_name || "",
        role: x.role_title || "",
        email: x.email || "",
        phone: x.phone || "",
        is_primary: !!x.is_primary,
      })));
      setDeletedContactIds([]);

      setSaveMsg("Opgeslagen ✅");
    } catch (e) {
      setErr(formatSbError(e));
    } finally {
      setSaving(false);
    }
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
                    <input
                      value={draft.kvk_number}
                      onChange={(e) => setField("kvk_number", e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      className="w-full"
                      placeholder="Bijv. 74338269"
                    />
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
                      <option value="Strategisch">Strategische leverancier</option>
                      <option value="Knelpunt">Knelpunt leverancier</option>
                      <option value="Hefboom">Hefboom leverancier</option>
                      <option value="Routine">Routine leverancier</option>
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
                  {(contacts || []).length === 0 ? (
                    <Notice title="Nog geen contactpersonen">Klik op “+ Contactpersoon” om er één toe te voegen.</Notice>
                  ) : null}

                  {(contacts || []).map((c, idx) => (
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
