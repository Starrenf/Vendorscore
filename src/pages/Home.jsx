import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Notice from "../components/Notice";
import TrafficLight from "../components/TrafficLight";
import { supabase } from "../lib/supabase";
import { getRuntimeConfig } from "../lib/runtimeConfig";
import { useApp } from "../state/AppState";
import { loadGovernance } from "../lib/governanceStore";
import { DEMO_SUPPLIERS, governanceToLight, summarizeCockpit } from "../lib/governanceCockpit";
import { isDemoMode } from "../lib/demoMode";
import PartnerSchoolsStrip from "../components/PartnerSchoolsStrip";

export default function Home() {
  const { session, organization } = useApp();
  const cfg = getRuntimeConfig();
  const client = supabase();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setErr("");
      if (!session || !organization || !client) {
        if (isDemoMode()) {
          setRows(isDemoMode() ? DEMO_SUPPLIERS : []);
          setUsingDemo(isDemoMode());
        } else {
          setRows([]);
          setUsingDemo(false);
        }
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await client
          .from("suppliers")
          .select("id,name,classification,strategic_type")
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
                classification: supplier.classification || supplier.strategic_type || "Onbekend",
                contractStatus: "Actief",
                governancePercent,
                notesCount,
              };
            } catch {
              return {
                id: supplier.id,
                name: supplier.name,
                classification: supplier.classification || supplier.strategic_type || "Onbekend",
                contractStatus: "Actief",
                governancePercent: 0,
                notesCount: 0,
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
          setErr(e?.message || "Dashboard kon niet worden geladen");
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
  }, [session, organization?.id, client]);

  const stats = useMemo(() => summarizeCockpit(rows), [rows]);
  const topRows = useMemo(() => rows.slice(0, 5), [rows]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-6 md:p-8 backdrop-blur-sm text-white shadow-2xl">
        <div className="text-sm uppercase tracking-[0.2em] text-white/70">Governance cockpit</div>
        <h1 className="mt-3 text-3xl md:text-5xl font-bold">Leverancierssturing in één oogopslag</h1>
        <p className="mt-4 max-w-3xl text-white/85 leading-7">
          VendorScore Pro brengt governance, leveranciersstrategie en opvolging samen in een visueel dashboard dat in dertig seconden te begrijpen is.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white/95 text-slate-900 p-5 shadow-lg">
            <div className="text-xs uppercase tracking-wide text-slate-500">Leveranciers</div>
            <div className="mt-2 text-4xl font-bold">{stats.suppliers}</div>
          </div>
          <div className="rounded-2xl bg-white/95 text-slate-900 p-5 shadow-lg">
            <div className="text-xs uppercase tracking-wide text-slate-500">Governance compleet</div>
            <div className="mt-2 text-4xl font-bold">{stats.governanceComplete}%</div>
          </div>
          <div className="rounded-2xl bg-white/95 text-slate-900 p-5 shadow-lg">
            <div className="text-xs uppercase tracking-wide text-slate-500">Open acties</div>
            <div className="mt-2 text-4xl font-bold">{stats.openActions}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {!session ? <Link className="btn btn-primary" to="/login">Inloggen</Link> : null}
          <Link className="btn" to="/dashboard">Dashboard</Link>
          <Link className="btn" to="/suppliers">Leveranciers</Link>
          <Link className="btn" to="/status">Statuspagina</Link>
          <Link className="btn" to="/methodiek">Governance</Link>
        </div>
      </div>

      {usingDemo ? (
        <Notice title="Demo data actief">
          Er zijn nog geen leveranciers gevonden voor deze organisatie. Daarom toont de cockpit voorbeelddata voor een congresdemo.
        </Notice>
      ) : null}

      {err ? <Notice title="Dashboard" tone="danger">{err}</Notice> : null}

      <PartnerSchoolsStrip />

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Leveranciersoverzicht met traffic lights</h2>
            <p className="text-sm text-slate-600 mt-1">Snel inzicht in strategie, governance-volwassenheid en prioriteit.</p>
          </div>
          <div className="text-sm text-slate-500">Config bron: <span className="badge">{cfg.source}</span></div>
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-600">Laden…</div> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="text-left py-3 pr-4">Leverancier</th>
                <th className="text-left py-3 pr-4">Strategie</th>
                <th className="text-left py-3 pr-4">Governance</th>
                <th className="text-left py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((row) => {
                const light = governanceToLight(row.governancePercent);
                const content = (
                  <>
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4">{row.classification}</td>
                    <td className="py-3 pr-4">{row.governancePercent}%</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2"><TrafficLight value={light} /><span>{row.governancePercent > 75 ? "Groen" : row.governancePercent >= 50 ? "Oranje" : "Rood"}</span></div>
                    </td>
                  </>
                );

                return usingDemo ? (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition">{content}</tr>
                ) : (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer" onClick={() => (window.location.href = `/suppliers/${row.id}`)}>{content}</tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
