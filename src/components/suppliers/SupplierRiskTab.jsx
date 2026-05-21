import { useEffect, useState } from "react";
import { getSupplierRiskProfile, saveSupplierRiskProfile } from "../../lib/supplierRisk";

const defaultForm = {
  impact_on_education: 1,
  financial_impact: 1,
  operational_dependency: 1,
  supplier_replaceability: 1,
  notes: "",
};

export default function SupplierRiskTab({ supplier, organization }) {
  const [form, setForm] = useState(defaultForm);
  const [savedRisk, setSavedRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supplier?.id) return;
    loadRisk();
  }, [supplier?.id]);

  async function loadRisk() {
    try {
      setLoading(true);
      setError("");
      const data = await getSupplierRiskProfile(supplier.id);
      if (data) {
        setSavedRisk(data);
        setForm({
          impact_on_education: data.impact_on_education ?? 1,
          financial_impact: data.financial_impact ?? 1,
          operational_dependency: data.operational_dependency ?? 1,
          supplier_replaceability: data.supplier_replaceability ?? 1,
          notes: data.notes ?? "",
        });
      } else {
        setSavedRisk(null);
        setForm(defaultForm);
      }
    } catch (err) {
      setError(err.message || "Fout bij laden risicoprofiel");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const payload = {
        organization_id: supplier.organization_id || organization?.id,
        supplier_id: supplier.id,
        ...form,
        updated_at: new Date().toISOString(),
      };
      const saved = await saveSupplierRiskProfile(payload);
      setSavedRisk(saved);
    } catch (err) {
      setError(err.message || "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl bg-white p-6 shadow">Risicoprofiel laden…</div>;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-6">
        <div>
          <h2 className="text-lg font-semibold">Risicoprofiel</h2>
          <p className="mt-1 text-sm text-slate-600">
            Losgekoppeld van beheersstatus, zodat risico en inrichting apart beoordeeld worden.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ScoreField
            label="Impact op onderwijs"
            value={form.impact_on_education}
            onChange={(value) => setForm((prev) => ({ ...prev, impact_on_education: value }))}
          />
          <ScoreField
            label="Financiële impact"
            value={form.financial_impact}
            onChange={(value) => setForm((prev) => ({ ...prev, financial_impact: value }))}
          />
          <ScoreField
            label="Operationele afhankelijkheid"
            value={form.operational_dependency}
            onChange={(value) => setForm((prev) => ({ ...prev, operational_dependency: value }))}
          />
          <ScoreField
            label="Vervangbaarheid leverancier"
            value={form.supplier_replaceability}
            onChange={(value) => setForm((prev) => ({ ...prev, supplier_replaceability: value }))}
            reverseMeaning
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block font-medium">Toelichting</label>
          <textarea
            className="w-full min-h-[120px]"
            rows={4}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Waarom is dit risico laag, midden of hoog?"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Risicoprofiel opslaan"}
          </button>

          {savedRisk?.overall_risk_score ? (
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm">
              Gemiddelde score: <strong>{savedRisk.overall_risk_score}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ScoreField({ label, value, onChange, reverseMeaning = false }) {
  return (
    <div>
      <label className="mb-1 block font-medium">{label}</label>
      <select className="w-full" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        <option value={1}>{reverseMeaning ? "Eenvoudig" : "Laag"}</option>
        <option value={2}>{reverseMeaning ? "Gemiddeld" : "Midden"}</option>
        <option value={3}>{reverseMeaning ? "Moeilijk" : "Hoog"}</option>
      </select>
    </div>
  );
}
