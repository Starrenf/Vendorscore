import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import { useToast } from "../components/ToastProvider";

const STRATEGIES = ["Strategisch", "Knelpunt", "Hefboom", "Routine"];

export default function NewEvaluation() {
  const toast = useToast();
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
      if (!session) {
        nav("/login");
        return;
      }
      if (!organization) {
        nav("/onboarding");
        return;
      }
      if (!client) {
        nav("/settings");
        return;
      }

      const { data, error } = await client
        .from("suppliers")
        .select("id,name,organization_id")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        setErr(error.message);
        toast.error(error.message || "Onbekende fout");
        return;
      }

      setSuppliers(data || []);
    }

    run();
  }, [session, organization, client, nav, toast]);

  const supplierName = useMemo(
    () => suppliers.find((s) => s.id === supplierId)?.name,
    [suppliers, supplierId]
  );

  async function create(e) {
    e.preventDefault();
    setErr("");

    if (!supplierId) {
      setErr("Kies eerst een leverancier.");
      return;
    }

    setBusy(true);

    const currentYear = new Date().getFullYear();
    const finalTitle = title.trim() || `Beoordeling ${currentYear} – ${supplierName ?? "leverancier"}`;
    const payload = {
      organization_id: organization.id,
      supplier_id: supplierId,
      strategy,
      year: currentYear,
      title: finalTitle,
    };

    try {
      const { data, error } = await client
        .from("evaluations")
        .insert([payload])
        .select("id,organization_id,supplier_id,year,title")
        .single();

      if (error) {
        const isDuplicate = /evaluations_.*unique/i.test(error.message || "") || error.code === "23505";
        if (isDuplicate) {
          const { data: existing, error: existingError } = await client
            .from("evaluations")
            .select("id,organization_id,supplier_id,year,title")
            .eq("organization_id", organization.id)
            .eq("supplier_id", supplierId)
            .eq("year", currentYear)
            .eq("title", finalTitle)
            .maybeSingle();

          if (existingError) {
            throw existingError;
          }

          if (existing?.id) {
            toast.success("Beoordeling bestond al en is geopend.");
            nav(`/evaluations/${existing.id}`, {
              replace: true,
              state: { createdKey: existing },
            });
            return;
          }
        }

        throw error;
      }

      if (!data?.id) {
        throw new Error("Opslaan mislukt: geen beoordeling-id teruggekregen.");
      }

      toast.success(`Beoordeling ${currentYear} aangemaakt.`);
      nav(`/evaluations/${data.id}`, {
        replace: true,
        state: { createdKey: data },
      });
    } catch (error) {
      const message =
        error?.message ||
        "Opslaan mislukt: geen data teruggekregen (mogelijk RLS/policies of ontbrekende organisatie-koppeling).";
      setErr(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Nieuwe beoordeling</h1>
        <p className="text-sm text-slate-600 mt-1">
          Maak een nieuwe beoordeling aan. Het jaar wordt automatisch gevuld op basis van het huidige kalenderjaar.
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        <form className="mt-4 grid gap-4" onSubmit={create}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Leverancier</label>
              <select className="w-full" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">— kies —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label>Leveranciersstrategie</label>
              <select className="w-full" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                {STRATEGIES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label>Titel (optioneel)</label>
            <input
              className="w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. kwartaal-evaluatie Q1"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Jaar beoordeling: <span className="font-semibold">{new Date().getFullYear()}</span>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? "Aanmaken…" : "Aanmaken"}
            </button>
            <button className="btn" type="button" onClick={() => nav(-1)}>
              Annuleren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
