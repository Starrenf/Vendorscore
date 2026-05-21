import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Notice from "../components/Notice";
import TrafficLight from "../components/TrafficLight";
import { supabase as getSupabase } from "../lib/supabase";
import { loadGovernance } from "../lib/governanceStore";
import { useApp } from "../state/AppState";
import { DEMO_SUPPLIERS, governanceToLight, renderProgressBar } from "../lib/governanceCockpit";
import { isDemoMode } from "../lib/demoMode";
import DemoModeToggle from "../components/DemoModeToggle";

function Progress({ percent }) {
  return (
    <div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${percent > 75 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-500 font-mono">{renderProgressBar(percent)}</div>
    </div>
  );
}

export default function StatusOverview() {
  const { organization, loading: appLoading } = useApp();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr(null);
      setLoading(true);

      try {
        if (!organization?.id) {
          setRows(isDemoMode() ? DEMO_SUPPLIERS : []);
          setUsingDemo(isDemoMode());
          setLoading(false);
          return;
        }

        const client = getSupabase();
        if (!client) {
          setRows(isDemoMode() ? DEMO_SUPPLIERS : []);
          setUsingDemo(isDemoMode());
          setLoading(false);
          return;
        }

        const { data, error } = await client
          .from("suppliers")
          .select("id,name,category,classification,strategic_type")
          .eq("organization_id", organization.id)
          .order("name", { ascending: true });

        if (error) throw error;
        const list = data || [];

        if (!list.length) {
          if (!cancelled) {
            setRows(isDemoMode() ? DEMO_SUPPLIERS : []);
            setUsingDemo(isDemoMode());
          }
          return;
        }

        const entries = await Promise.all(
          list.map(async (supplier) => {
            try {
              const governance = await loadGovernance({ client, organizationId: organization.id, supplierId: supplier.id });
              const checks = governance?.checks || {};
              const notes = governance?.notes || {};
              const keys = Object.keys(checks);
              const done = keys.filter((key) => !!checks[key]).length;
              const total = keys.length;
              const governancePercent = total ? Math.round((done / total) * 100) : 0;
              const notesCount = Object.values(notes).filter((value) => String(value || "").trim().length > 0).length;
              return {
                id: supplier.id,
                name: supplier.name,
                classification: supplier.classification || supplier.strategic_type || "—",
                governancePercent,
                notesCount,
                total,
                done,
              };
            } catch {
              return {
                id: supplier.id,
                name: supplier.name,
                classification: supplier.classification || supplier.strategic_type || "—",
                governancePercent: 0,
                notesCount: 0,
                total: 0,
                done: 0,
              };
            }
          })
        );

        if (!cancelled) {
          setRows(entries);
          setUsingDemo(false);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Kon statusoverzicht niet laden");
          setRows(isDemoMode() ? DEMO_SUPPLIERS : []);
          setUsingDemo(isDemoMode());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const summary = useMemo(() => {
    const totalSuppliers = rows.length;
    const green = rows.filter((row) => governanceToLight(row.governancePercent) === "green").length;
    const amber = rows.filter((row) => governanceToLight(row.governancePercent) === "amber").length;
    const red = rows.filter((row) => governanceToLight(row.governancePercent) === "red").length;
    const avg = totalSuppliers ? Math.round(rows.reduce((sum, row) => sum + (row.governancePercent || 0), 0) / totalSuppliers) : 0;
    return { totalSuppliers, green, amber, red, avg };
  }, [rows]);

  const busy = appLoading || loading;

  return (
    <div className="space-y-4 rounded-3xl border border-white/70 bg-white/92 p-4 md:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Statuspagina</h1>
          <p className="text-sm text-slate-600">Operationeel overzicht met voortgang, opmerkingen en traffic lights per leverancier.</p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <div className="font-medium text-slate-800">Organisatie</div>
          <div>{organization?.name || "Demo modus"}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Demo modus</div>
          <div className="text-xs text-slate-600">Schakel direct tussen demo-data en echte data.</div>
        </div>
        <DemoModeToggle />
      </div>

      {usingDemo ? (
        <Notice title="Demo data actief">
          Deze statuspagina toont voorbeeldleveranciers zolang er nog geen eigen leveranciers beschikbaar zijn.
        </Notice>
      ) : null}

      {err ? <Notice kind="error" title="Fout">{err}</Notice> : null}

      {busy ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">Laden…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Leveranciers</div><div className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalSuppliers}</div></div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-emerald-700">Groen</div><div className="mt-2 text-3xl font-semibold text-emerald-900">{summary.green}</div></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-amber-700">Oranje</div><div className="mt-2 text-3xl font-semibold text-amber-900">{summary.amber}</div></div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-rose-700">Rood</div><div className="mt-2 text-3xl font-semibold text-rose-900">{summary.red}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">Gemiddeld</div><div className="mt-2 text-3xl font-semibold text-slate-900">{summary.avg}%</div></div>
          </div>

          <div className="card p-0 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-800">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-4">Leverancier</th>
                    <th className="text-left p-4">Checklist</th>
                    <th className="text-left p-4">Opmerkingen</th>
                    <th className="text-left p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const light = governanceToLight(row.governancePercent);
                    const badge = light === "green" ? "Groen" : light === "amber" ? "Oranje" : "Rood";
                    return (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                        <td className="p-4 font-medium">
                          {usingDemo ? row.name : <Link className="no-underline hover:underline" to={`/suppliers/${row.id}`}>{row.name}</Link>}
                        </td>
                        <td className="p-4 min-w-[280px]"><Progress percent={row.governancePercent} /></td>
                        <td className="p-4">{row.notesCount}</td>
                        <td className="p-4"><div className="flex items-center gap-2"><TrafficLight value={light} /><span>{badge}</span></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
