import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Notice from "../components/Notice";
import TrafficLight from "../components/TrafficLight";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import { loadGovernance } from "../lib/governanceStore";
import { DEMO_SUPPLIERS, governanceToLight } from "../lib/governanceCockpit";
import { isDemoMode } from "../lib/demoMode";
import { supplierDomainLabel } from "../lib/supplierDomains";

function MetricCard({ label, value, subtext, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {subtext ? <div className="mt-1 text-sm opacity-80">{subtext}</div> : null}
    </div>
  );
}

function BarRow({ label, value, total, tone = "bg-slate-500" }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="text-slate-500">{value} · {pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ManagementHeader({ kpis }) {
  const trendTone = kpis.trend >= 0 ? "bg-blue-500/95" : "bg-slate-700/95";
  const trendPrefix = kpis.trend >= 0 ? "+" : "";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-500/95 p-5 text-white shadow-xl">
        <div className="text-sm uppercase tracking-wide text-white/80">Binnen norm</div>
        <div className="mt-2 text-4xl font-bold">{kpis.healthyPercent}%</div>
        <div className="mt-1 text-sm text-white/85">Leveranciers met governance-status groen</div>
      </div>

      <div className="rounded-3xl border border-rose-200 bg-rose-500/95 p-5 text-white shadow-xl">
        <div className="text-sm uppercase tracking-wide text-white/80">Risico leveranciers</div>
        <div className="mt-2 text-4xl font-bold">{kpis.risk}</div>
        <div className="mt-1 text-sm text-white/85">Rode leveranciers die direct aandacht vragen</div>
      </div>

      <div className={`rounded-3xl border border-white/10 p-5 text-white shadow-xl ${trendTone}`}>
        <div className="text-sm uppercase tracking-wide text-white/80">Trend</div>
        <div className="mt-2 text-4xl font-bold">{trendPrefix}{kpis.trend}%</div>
        <div className="mt-1 text-sm text-white/85">Vergelijking actuele beoordelingsdekking t.o.v. vorig jaar</div>
      </div>
    </div>
  );
}

function ProgressRing({ percent }) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="relative h-36 w-36 shrink-0 rounded-full bg-[conic-gradient(#2563eb_calc(var(--pct)*1%),#e2e8f0_0)]" style={{ '--pct': safe }}>
      <div className="absolute inset-3 rounded-full bg-white shadow-inner" />
      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div>
          <div className="text-3xl font-bold text-slate-900">{safe}%</div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Dekking</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { session, organization } = useApp();
  const client = supabase();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [usingDemo, setUsingDemo] = useState(false);
  const [rows, setRows] = useState([]);
  const [evaluations, setEvaluations] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr("");
      setLoading(true);

      try {
        if (!session || !organization || !client) {
          const demo = isDemoMode() ? DEMO_SUPPLIERS : [];
          if (!cancelled) {
            setRows(demo.map((row) => ({ ...row, latestEvaluation: null })));
            setEvaluations([]);
            setUsingDemo(isDemoMode());
          }
          return;
        }

        const { data: suppliers, error: supplierErr } = await client
          .from("suppliers")
          .select("id,name,classification,strategic_type,created_at,category")
          .eq("organization_id", organization.id)
          .order("name", { ascending: true });
        if (supplierErr) throw supplierErr;

        const { data: evals, error: evalErr } = await client
          .from("evaluations")
          .select("id,supplier_id,title,year,strategy,created_at,organization_id")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });
        if (evalErr) throw evalErr;

        const { data: risks, error: riskErr } = await client
          .from("supplier_risk_profiles")
          .select("supplier_id,overall_risk_score");
        if (riskErr) throw riskErr;

        const { data: perfRows, error: perfErr } = await client
          .from("supplier_performance_reviews")
          .select("supplier_id,total_score,review_date,period_label,created_at")
          .eq("organization_id", organization.id)
          .order("review_date", { ascending: false });
        if (perfErr) throw perfErr;

        const riskBySupplier = new Map((risks || []).map((row) => [row.supplier_id, Number(row.overall_risk_score) || 0]));
        const perfBySupplier = new Map();
        for (const perf of perfRows || []) {
          if (!perfBySupplier.has(perf.supplier_id)) perfBySupplier.set(perf.supplier_id, perf);
        }

        const evalsBySupplier = new Map();
        for (const ev of evals || []) {
          if (!evalsBySupplier.has(ev.supplier_id)) {
            evalsBySupplier.set(ev.supplier_id, ev);
          }
        }

        const list = await Promise.all(
          (suppliers || []).map(async (supplier) => {
            let governancePercent = 0;
            let notesCount = 0;
            let checksDone = 0;
            let checksTotal = 0;
            try {
              const governance = await loadGovernance({ client, organizationId: organization.id, supplierId: supplier.id });
              const checks = governance?.checks || {};
              const notes = governance?.notes || {};
              const keys = Object.keys(checks);
              checksDone = keys.filter((key) => !!checks[key]).length;
              checksTotal = keys.length;
              governancePercent = checksTotal ? Math.round((checksDone / checksTotal) * 100) : 0;
              notesCount = Object.values(notes).filter((value) => String(value || "").trim().length > 0).length;
            } catch {
              // keep defaults
            }

            return {
              id: supplier.id,
              name: supplier.name,
              classification: supplier.classification || supplier.strategic_type || "Onbekend",
              domain: supplier.category || "generiek",
              governancePercent,
              riskScore: riskBySupplier.get(supplier.id) || 0,
              latestPerformance: perfBySupplier.get(supplier.id) || null,
              notesCount,
              checksDone,
              checksTotal,
              latestEvaluation: evalsBySupplier.get(supplier.id) || null,
            };
          })
        );

        if (!cancelled) {
          setRows(list);
          setEvaluations(evals || []);
          setUsingDemo(false);
        }
      } catch (e) {
        if (!cancelled) {
          const demo = isDemoMode() ? DEMO_SUPPLIERS : [];
          setRows(demo.map((row) => ({ ...row, latestEvaluation: null })));
          setEvaluations([]);
          setUsingDemo(isDemoMode());
          setErr(e?.message || "Dashboard kon niet worden geladen");
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

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const summary = useMemo(() => {
    const suppliers = rows.length;
    const avgGovernance = suppliers
      ? Math.round(rows.reduce((sum, row) => sum + (Number(row.governancePercent) || 0), 0) / suppliers)
      : 0;
    const green = rows.filter((row) => governanceToLight(row.governancePercent) === "green").length;
    const amber = rows.filter((row) => governanceToLight(row.governancePercent) === "amber").length;
    const red = rows.filter((row) => governanceToLight(row.governancePercent) === "red").length;
    const evaluatedThisYear = rows.filter((row) => Number(row.latestEvaluation?.year) === currentYear).length;
    const openActions = rows.reduce((sum, row) => sum + (Number(row.notesCount) || 0), 0);
    const healthyPercent = suppliers ? Math.round((green / suppliers) * 100) : 0;
    const avgRisk = suppliers ? (Math.round((rows.reduce((sum, row) => sum + (Number(row.riskScore) || 0), 0) / suppliers) * 10) / 10) : 0;
    const perfRows = rows.filter((row) => Number(row.latestPerformance?.total_score) > 0);
    const avgPerformance = perfRows.length ? Math.round(perfRows.reduce((sum, row) => sum + Number(row.latestPerformance?.total_score || 0), 0) / perfRows.length) : 0;
    const prevCount = evaluations.filter((ev) => Number(ev.year) === previousYear).length;
    const thisCount = evaluations.filter((ev) => Number(ev.year) === currentYear).length;
    const trend = prevCount ? Math.round(((thisCount - prevCount) / prevCount) * 100) : (thisCount ? 100 : 0);
    const coveragePercent = suppliers ? Math.round((evaluatedThisYear / suppliers) * 100) : 0;
    return { suppliers, avgGovernance, avgRisk, avgPerformance, green, amber, red, evaluatedThisYear, openActions, healthyPercent, trend, coveragePercent };
  }, [rows, evaluations, currentYear, previousYear]);

  const domainStats = useMemo(() => {
    const buckets = {};
    rows.forEach((row) => {
      const key = supplierDomainLabel(row.domain);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const classificationStats = useMemo(() => {
    const buckets = { Strategisch: 0, Hefboom: 0, Knelpunt: 0, Routine: 0, Onbekend: 0 };
    rows.forEach((row) => {
      const key = buckets[row.classification] != null ? row.classification : "Onbekend";
      buckets[key] += 1;
    });
    return Object.entries(buckets).filter(([, value]) => value > 0);
  }, [rows]);

  const priorities = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        const lightA = governanceToLight(a.governancePercent);
        const lightB = governanceToLight(b.governancePercent);
        const rank = { red: 0, amber: 1, green: 2 };
        if (rank[lightA] !== rank[lightB]) return rank[lightA] - rank[lightB];
        return (a.governancePercent || 0) - (b.governancePercent || 0);
      })
      .slice(0, 5);
  }, [rows]);

  const recentEvaluations = useMemo(() => {
    const idToSupplier = new Map(rows.map((row) => [row.id, row.name]));
    return evaluations.slice(0, 6).map((ev) => ({
      ...ev,
      supplierName: idToSupplier.get(ev.supplier_id) || "Leverancier",
    }));
  }, [evaluations, rows]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f2a44] via-[#1e3a5f] to-[#2f5b8a] p-6 md:p-8 text-white shadow-2xl backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-white/70">Dashboard 2.0</div>
            <h1 className="mt-3 text-3xl md:text-5xl font-bold">Managementoverzicht leveranciers & governance</h1>
            <p className="mt-4 max-w-3xl text-white/85 leading-7">
              In één scherm zie je hoeveel leveranciers binnen norm vallen, waar directe risico’s zitten en hoe de beoordelingsdekking zich ontwikkelt.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-primary" to="/suppliers">Leveranciers</Link>
            <Link className="btn" to="/status">Statuspagina</Link>
            <Link className="btn" to="/insights">Inzichten</Link>
          </div>
        </div>
      </div>

      {usingDemo ? (
        <Notice title="Voorbeeldweergave actief">
          Er zijn nog geen leveranciers gevonden voor deze organisatie. Daarom toont het dashboard voorbeeldgegevens om de cockpit en managementweergave te illustreren.
        </Notice>
      ) : null}

      {err ? <Notice title="Dashboard" tone="danger">{err}</Notice> : null}

      <ManagementHeader kpis={{ healthyPercent: summary.healthyPercent, risk: summary.red, trend: summary.trend }} />

<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Leveranciers" value={summary.suppliers} subtext="Totaal in deze organisatie" tone="slate" />
        <MetricCard label="Gem. governance" value={`${summary.avgGovernance}%`} subtext="Checklistvolwassenheid" tone="blue" />
        <MetricCard label="Gem. risico" value={summary.avgRisk || "0.0"} subtext="Gemiddelde risicoscore (1–3)" tone="amber" />
        <MetricCard label="Gem. prestatie" value={summary.avgPerformance ? `${summary.avgPerformance}/100` : "—"} subtext="Laatste prestatiemeting" tone="green" />
        <MetricCard label={`Beoordeeld in ${currentYear}`} value={summary.evaluatedThisYear} subtext="Leveranciers met actuele beoordeling" tone="green" />
        <MetricCard label="Open acties" value={summary.openActions} subtext="Op basis van notities en opvolging" tone="amber" />
        <MetricCard label="Rood" value={summary.red} subtext="Directe managementaandacht" tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Prioriteitenlijst</h2>
              <p className="mt-1 text-sm text-slate-600">De leveranciers met de meeste risico’s of de laagste governance-score.</p>
            </div>
            <Link className="btn" to="/suppliers">Alles bekijken</Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? <div className="text-sm text-slate-600">Dashboard laden…</div> : null}
            {!loading && !priorities.length ? <div className="text-sm text-slate-600">Nog geen leveranciers gevonden.</div> : null}
            {priorities.map((row) => {
              const light = governanceToLight(row.governancePercent);
              const label = light === "green" ? "Groen" : light === "amber" ? "Oranje" : "Rood";
              return (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{row.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500"><span>{row.classification}</span><span>·</span><span>{supplierDomainLabel(row.domain)}</span></div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-700">
                      <TrafficLight value={light} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Governance</span>
                      <span>{row.governancePercent}% · {row.checksDone}/{row.checksTotal || 0} checks</span>
                    </div>
                    <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${light === "green" ? "bg-emerald-500" : light === "amber" ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${row.governancePercent}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                    <div>Laatste beoordeling: <span className="font-medium text-slate-700">{row.latestEvaluation?.title || row.latestEvaluation?.year || "nog niet beoordeeld"}</span></div>
                    <div>Prestatie: <span className="font-medium text-slate-700">{row.latestPerformance?.total_score ? `${row.latestPerformance.total_score}/100` : "nog geen meting"}</span></div>
                    <div>Risico: <span className="font-medium text-slate-700">{row.riskScore ? row.riskScore : "nog niet ingevuld"}</span></div>
                    <div>Domein: <span className="font-medium text-slate-700">{supplierDomainLabel(row.domain)}</span></div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    {usingDemo ? null : <Link className="btn" to={`/suppliers/${row.id}`}>Open leverancier</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold">Beoordelingsdekking</h2>
            <p className="mt-1 text-sm text-slate-600">Hoeveel leveranciers al een actuele beoordeling hebben in {currentYear}.</p>
            <div className="mt-5 flex items-center gap-6">
              <ProgressRing percent={summary.coveragePercent} />
              <div className="space-y-3 text-sm text-slate-700">
                <div><span className="font-semibold text-slate-900">Actueel beoordeeld:</span> {summary.evaluatedThisYear} van {summary.suppliers}</div>
                <div><span className="font-semibold text-slate-900">Gem. governance:</span> {summary.avgGovernance}%</div>
                <div><span className="font-semibold text-slate-900">Open acties:</span> {summary.openActions}</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold">Traffic lights</h2>
            <p className="mt-1 text-sm text-slate-600">Verdeling van leveranciers op basis van governance-volwassenheid.</p>
            <div className="mt-4 space-y-4">
              <BarRow label="Groen" value={summary.green} total={summary.suppliers} tone="bg-emerald-500" />
              <BarRow label="Oranje" value={summary.amber} total={summary.suppliers} tone="bg-amber-500" />
              <BarRow label="Rood" value={summary.red} total={summary.suppliers} tone="bg-rose-500" />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold">Domeinverdeling</h2>
            <p className="mt-1 text-sm text-slate-600">Aantal leveranciers per gekozen werkdomein.</p>
            <div className="mt-4 space-y-4">
              {domainStats.length ? domainStats.map(([label, value]) => (
                <BarRow key={label} label={label} value={value} total={summary.suppliers} tone="bg-indigo-500" />
              )) : <div className="text-sm text-slate-600">Nog geen domeinen gekozen.</div>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold">Verdeling Kraljic-categorieën</h2>
            <p className="mt-1 text-sm text-slate-600">Aantal leveranciers per leveranciersstrategie.</p>
            <div className="mt-4 space-y-4">
              {classificationStats.length ? classificationStats.map(([label, value]) => (
                <BarRow key={label} label={label} value={value} total={summary.suppliers} tone="bg-blue-500" />
              )) : <div className="text-sm text-slate-600">Nog geen leveranciers aanwezig.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Recente beoordelingen</h2>
              <p className="mt-1 text-sm text-slate-600">De meest recent vastgelegde reviews binnen jouw organisatie.</p>
            </div>
            <Link className="btn" to="/suppliers">Nieuwe beoordeling</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 text-left">Leverancier</th>
                  <th className="py-3 pr-4 text-left">Titel</th>
                  <th className="py-3 pr-4 text-left">Jaar</th>
                  <th className="py-3 text-left">Datum</th>
                </tr>
              </thead>
              <tbody>
                {!recentEvaluations.length ? (
                  <tr>
                    <td className="py-4 text-slate-600" colSpan={4}>Nog geen beoordelingen gevonden.</td>
                  </tr>
                ) : recentEvaluations.map((ev) => (
                  <tr key={ev.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium">{ev.supplierName}</td>
                    <td className="py-3 pr-4">{ev.title || "Beoordeling"}</td>
                    <td className="py-3 pr-4">{ev.year || "—"}</td>
                    <td className="py-3">{ev.created_at ? new Date(ev.created_at).toLocaleDateString("nl-NL") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold">Aanbevolen vervolgstappen</h2>
          <p className="mt-1 text-sm text-slate-600">Handige acties om de governance en beoordeling snel scherper te krijgen.</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">1. Werk de rode leveranciers eerst bij</div>
              <div className="mt-1 text-sm text-slate-600">Controleer contract, SLA, DAP/DAB en verwerkersovereenkomst voor leveranciers met een rode status.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">2. Plan beoordelingen voor dit jaar</div>
              <div className="mt-1 text-sm text-slate-600">Nog niet alle leveranciers hebben een beoordeling in {currentYear}. Gebruik het leveranciersoverzicht om reviews toe te voegen.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">3. Bespreek verbeterpunten tijdens overleggen</div>
              <div className="mt-1 text-sm text-slate-600">Gebruik de notities en governance-checklists als input voor leveranciers- en contractgesprekken.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
