import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import { useToast } from "../components/ToastProvider";
import { DEFAULT_STRATEGY_WEIGHTS } from "../lib/scoring";

const STRATEGIES = ["Strategisch", "Knelpunt", "Hefboom", "Routine"];
const BLOCKS = ["K1", "K2", "K3", "K4", "K5"];

function buildDefaultRows(organizationId) {
  return STRATEGIES.flatMap((strategy) =>
    BLOCKS.map((k_block) => ({
      organization_id: organizationId,
      strategy,
      k_block,
      weight: Number(DEFAULT_STRATEGY_WEIGHTS?.[strategy]?.[k_block] ?? 0),
    }))
  );
}

export default function AdminWeights() {
  const toast = useToast();
  const { pathname } = useLocation();
  const adminTabs = useMemo(
    () => [
      { to: "/admin/orgs", label: "Organisaties", active: pathname.startsWith("/admin/orgs") },
      { to: "/admin/weights", label: "Beoordelingswaardes", active: pathname.startsWith("/admin/weights") },
    ],
    [pathname]
  );
  const { session, organization, profile } = useApp();
  const client = supabase();

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const canUse = profile?.role === "admin";

  useEffect(() => {
    async function run() {
      setErr("");
      if (!session || !organization || !client) return;

      setLoading(true);
      const { data, error } = await client
        .from("weight_configs")
        .select("id,organization_id,strategy,k_block,weight")
        .eq("organization_id", organization.id)
        .order("strategy", { ascending: true })
        .order("k_block", { ascending: true });

      if (error) {
        setErr(error.message);
        toast.error(error.message || "Onbekende fout");
      } else {
        setRows(data?.length ? data : buildDefaultRows(organization.id));
      }
      setLoading(false);
    }

    run();
  }, [session, organization, client, toast]);

  const matrix = useMemo(() => {
    const byStrategy = {};
    for (const strategy of STRATEGIES) {
      byStrategy[strategy] = {};
      for (const block of BLOCKS) {
        byStrategy[strategy][block] = Number(DEFAULT_STRATEGY_WEIGHTS?.[strategy]?.[block] ?? 0);
      }
    }

    for (const row of rows) {
      if (!row?.strategy || !row?.k_block) continue;
      if (!byStrategy[row.strategy]) byStrategy[row.strategy] = {};
      byStrategy[row.strategy][row.k_block] = Number(row.weight) || 0;
    }

    return byStrategy;
  }, [rows]);

  function updateCell(strategy, k_block, value) {
    const parsed = Number(value);
    const nextValue = Number.isFinite(parsed) ? parsed : 0;

    setRows((prev) => {
      const next = prev.map((row) => ({ ...row }));
      const idx = next.findIndex((row) => row.strategy === strategy && row.k_block === k_block);
      if (idx >= 0) {
        next[idx].weight = nextValue;
        return next;
      }

      return [
        ...next,
        {
          organization_id: organization.id,
          strategy,
          k_block,
          weight: nextValue,
            },
      ];
    });
  }

  function resetDefaults() {
    if (!organization?.id) return;
    setRows(buildDefaultRows(organization.id));
    toast.success("Standaard wegingen teruggezet in het scherm.");
  }

  async function saveAll() {
    setErr("");
    if (!client || !organization) return;
    setSaving(true);

    try {
      const payload = STRATEGIES.flatMap((strategy) =>
        BLOCKS.map((k_block) => {
          const existing = rows.find((row) => row.strategy === strategy && row.k_block === k_block);
          return {
            id: existing?.id,
            organization_id: organization.id,
            strategy,
            k_block,
            weight: Number(matrix?.[strategy]?.[k_block] ?? 0),
          };
        })
      );

      const { error } = await client
        .from("weight_configs")
        .upsert(payload, { onConflict: "organization_id,strategy,k_block" });

      if (error && /constraint|conflict|unique/i.test(error.message || "")) {
        // Fallback for environments where the unique index is not present yet.
        const del = await client.from("weight_configs").delete().eq("organization_id", organization.id);
        if (del.error) throw del.error;

        const ins = await client
          .from("weight_configs")
          .insert(payload.map(({ id, ...rest }) => rest));
        if (ins.error) throw ins.error;

        toast.success("Beoordelingswaardes opgeslagen.");
        setRows(payload);
        return;
      }

      if (error) throw error;

      toast.success("Beoordelingswaardes opgeslagen.");
      setRows(payload);
    } catch (e) {
      const message = e?.message || "Opslaan mislukt.";
      setErr(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (!canUse) {
    return (
      <div className="max-w-2xl">
        <Notice title="Geen toegang" tone="warning">
          Deze pagina is alleen beschikbaar voor admins.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-slate-600 text-sm">Beheer organisaties en beoordelingswaardes per strategie en K-blok.</p>
        </div>
        <div className="flex gap-2">
          {adminTabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={[
                "px-3 py-2 rounded-lg text-sm font-medium border",
                t.active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold">Beoordelingswaardes</h2>
        <p className="text-sm text-slate-600 mt-1">
          Hieronder kun je per leveranciersstrategie de wegingsmatrix aanpassen. Opslaan schrijft direct weg naar de tabel <span className="font-mono">weight_configs</span> voor jouw organisatie.
        </p>

        {err ? <Notice title="Fout" tone="danger">{err}</Notice> : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={saveAll} disabled={saving || loading}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
          <button className="btn" onClick={resetDefaults} disabled={saving || loading}>
            Reset naar Excel-standaard
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="py-3 pr-4">Strategie</th>
                {BLOCKS.map((block) => (
                  <th key={block} className="py-3 px-2 text-center">{block}</th>
                ))}
                <th className="py-3 pl-4 text-right">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {STRATEGIES.map((strategy) => {
                const total = BLOCKS.reduce((sum, block) => sum + Number(matrix?.[strategy]?.[block] ?? 0), 0);
                return (
                  <tr key={strategy} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-semibold">{strategy}</td>
                    {BLOCKS.map((block) => (
                      <td key={block} className="py-3 px-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="20"
                          value={matrix?.[strategy]?.[block] ?? 0}
                          onChange={(e) => updateCell(strategy, block, e.target.value)}
                          className="w-20 text-center"
                        />
                      </td>
                    ))}
                    <td className="py-3 pl-4 text-right font-medium">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Notice title="Standaardmatrix">
            Strategisch: 5 / 3 / 4 / 6 / 2 · Knelpunt: 4 / 3 / 6 / 5 / 2 · Hefboom: 5 / 6 / 4 / 2 / 3 · Routine: 4 / 5 / 6 / 3 / 2.
          </Notice>
          <Notice title="Multi-tenant">
            Alleen de regels van de actieve organisatie worden geladen en opgeslagen. Daardoor blijven instellingen netjes gescheiden per school/organisatie.
          </Notice>
        </div>
      </div>
    </div>
  );
}
