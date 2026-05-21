import { useEffect, useMemo, useState } from "react";
import {
  ensureChecklistForSupplier,
  getSupplierChecklistItems,
  rebuildChecklistForSupplier,
  updateSupplierChecklistItem,
} from "../../lib/supplierChecklist";
import { supplierDomainLabel } from "../../lib/supplierDomains";

function statusLabel(percent) {
  if (percent >= 75) return { text: "Op orde", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (percent >= 50) return { text: "Aandacht", tone: "text-amber-800 bg-amber-50 border-amber-200" };
  return { text: "Risico", tone: "text-rose-700 bg-rose-50 border-rose-200" };
}

export default function SupplierManagementChecklistTab({ supplier }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supplier?.id) return;

    async function init() {
      try {
        setLoading(true);
        setError("");
        await ensureChecklistForSupplier(supplier);
        const data = await getSupplierChecklistItems(supplier.id);
        setItems(data);
      } catch (err) {
        setError(err.message || "Fout bij laden checklist");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [supplier?.id]);

  async function loadItems() {
    try {
      setLoading(true);
      setError("");
      const data = await getSupplierChecklistItems(supplier.id);
      setItems(data);
    } catch (err) {
      setError(err.message || "Fout bij laden checklist");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(item) {
    try {
      const updated = await updateSupplierChecklistItem(item.id, {
        is_checked: !item.is_checked,
        updated_at: new Date().toISOString(),
      });
      setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
    } catch (err) {
      setError(err.message || "Bijwerken mislukt");
    }
  }

  async function handleRebuildChecklist() {
    try {
      setResetting(true);
      setError("");
      await rebuildChecklistForSupplier(supplier);
      await loadItems();
    } catch (err) {
      setError(err.message || "Checklist opnieuw opbouwen mislukt");
    } finally {
      setResetting(false);
    }
  }

  const percentage = useMemo(() => {
    if (!items.length) return 0;
    const checked = items.filter((item) => item.is_checked).length;
    return Math.round((checked / items.length) * 100);
  }, [items]);

  const grouped = useMemo(() => {
    return items.reduce((acc, item) => {
      const key = item.category || "Overig";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const state = statusLabel(percentage);

  if (loading) {
    return <div className="card p-6">Beheersstatus laden…</div>;
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Beheersstatus</h2>
            <p className="mt-2 text-sm text-slate-600">
              In hoeverre zijn de benodigde afspraken en documenten daadwerkelijk ingericht?
            </p>
            <div className="mt-2 text-sm text-slate-600">
              Actief domein: <span className="font-semibold">{supplierDomainLabel(supplier?.category)}</span>
            </div>
          </div>
          <button className="btn" onClick={handleRebuildChecklist} disabled={resetting}>
            {resetting ? "Checklist opnieuw opbouwen…" : "Checklist opnieuw opbouwen"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-4 min-w-[160px]">
            <div className="text-sm text-slate-500">Voortgang</div>
            <div className="text-2xl font-semibold">{percentage}%</div>
          </div>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${state.tone}`}>
            {state.text}
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="card p-6 space-y-6">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="mb-3 text-lg font-semibold">{category}</h3>
            <div className="space-y-3">
              {categoryItems.map((item) => (
                <label key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={item.is_checked || false}
                    onChange={() => handleToggle(item)}
                  />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    {item.notes ? <div className="text-sm text-slate-500">{item.notes}</div> : null}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}

        {!items.length ? (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Voor deze leverancier zijn nog geen checklist-items aangemaakt. Kies eerst een domein en gebruik daarna opnieuw opbouwen.
          </div>
        ) : null}
      </div>
    </div>
  );
}
