import { Link } from "react-router-dom";

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    info: "bg-sky-50 text-sky-800 border-sky-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };
  const cls = tones[tone] || tones.neutral;
  return (
    <span className={"inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border " + cls}>
      {children}
    </span>
  );
}

export default function Methodiek() {
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Methodiek & Uitleg</h1>
            <p className="text-sm text-slate-600 mt-1">
              VendorScore beoordeelt leveranciers objectief en transparant. De leveranciersstrategie is gebaseerd op het Kraljic-portfolio model
              (strategisch belang × leveringsrisico).
            </p>
          </div>
          <Link className="btn" to="/suppliers">Naar leveranciers</Link>
        </div>

        <div className="mt-6 space-y-6">
          <section className="space-y-3">
            <h2 className="font-semibold">1) Leveranciersstrategie (Kraljic)</h2>
            <p className="text-sm text-slate-600">
              Leveranciers worden ingedeeld in vier strategieën. Deze indeling helpt om de juiste focus te kiezen (samenwerking, risico, kosten, of efficiency).
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="card p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">Strategisch</div>
                  <Pill tone="danger">hoog belang • hoog risico</Pill>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Cruciale leverancier voor continuïteit en strategie. Focus op samenwerking, governance en innovatie.
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-600 mt-2 space-y-1">
                  <li>Relatie & samenwerking (K4) zwaar meewegen</li>
                  <li>Kwaliteit/continuïteit (K3) zwaar meewegen</li>
                  <li>Heldere escalatiepaden en gezamenlijke roadmap</li>
                </ul>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">Knelpunt</div>
                  <Pill tone="warning">hoog risico</Pill>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Beperkte alternatieven of kwetsbare levering. Focus op leveringszekerheid en risicobeperking.
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-600 mt-2 space-y-1">
                  <li>Continuïteit en afhankelijkheden expliciet maken</li>
                  <li>Mitigatie: alternatieven, exit, back-up procedures</li>
                  <li>Strakke SLA/KPI’s en incidentafspraken</li>
                </ul>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">Hefboom</div>
                  <Pill tone="info">hoog belang • laag risico</Pill>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Hoge (financiële) impact maar alternatieven beschikbaar. Focus op kosten- en contractoptimalisatie.
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-600 mt-2 space-y-1">
                  <li>Kosten & contract (K2) relatief zwaar</li>
                  <li>Prestatieafspraken (K1) strak meten</li>
                  <li>Onderhandelruimte benutten (benchmark/volume)</li>
                </ul>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">Routine</div>
                  <Pill tone="success">laag belang • laag risico</Pill>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Standaard leverancier met beperkte impact. Focus op eenvoud, standaardisatie en minimale beheerlást.
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-600 mt-2 space-y-1">
                  <li>Standaard processen en eenvoudige afspraken</li>
                  <li>Efficiënt beheer (self-service waar kan)</li>
                  <li>Niet over-engineeren: net genoeg governance</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">2) Wegingsmethodiek (K1–K5)</h2>
            <p className="text-sm text-slate-600">
              VendorScore werkt met beoordelingsblokken (K1–K5). Afhankelijk van de strategie worden blokken zwaarder of lichter meegewogen.
              In de KZL/Excel-logica worden gewichten genormaliseerd (som = 1). K5 telt alleen mee als er K5-invoer is.
            </p>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="card p-4">
                <div className="font-semibold">K1</div>
                <div className="text-slate-600">Afspraken & prestaties</div>
              </div>
              <div className="card p-4">
                <div className="font-semibold">K2</div>
                <div className="text-slate-600">Kosten & contract</div>
              </div>
              <div className="card p-4">
                <div className="font-semibold">K3</div>
                <div className="text-slate-600">Kwaliteit & continuïteit</div>
              </div>
              <div className="card p-4">
                <div className="font-semibold">K4</div>
                <div className="text-slate-600">Relatie & samenwerking</div>
              </div>
              <div className="card p-4 md:col-span-2">
                <div className="font-semibold">K5</div>
                <div className="text-slate-600">Innovatie & duurzaamheid (optioneel)</div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">3) Scoreberekening</h2>
            <p className="text-sm text-slate-600">
              Per criterium kies je een waardering (Uitstekend t/m Slecht). Deze wordt omgerekend naar een factor.
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="card p-4">
                <div className="font-semibold">Factoren per waardering</div>
                <div className="mt-2 text-sm text-slate-600 grid gap-1">
                  <div className="flex justify-between"><span>Uitstekend</span><span className="badge">1.0</span></div>
                  <div className="flex justify-between"><span>Goed</span><span className="badge">0.8</span></div>
                  <div className="flex justify-between"><span>Redelijk</span><span className="badge">0.6</span></div>
                  <div className="flex justify-between"><span>Matig</span><span className="badge">0.4</span></div>
                  <div className="flex justify-between"><span>Slecht</span><span className="badge">0.0</span></div>
                </div>
              </div>

              <div className="card p-4">
                <div className="font-semibold">Rekenstappen (vereenvoudigd)</div>
                <pre className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs overflow-auto">{`1) criteriumScore = punten(10) × factor
2) blokScore(0–10) = (Σ criteriumScore / Σ maxScore) × 10
3) eindBlok(0–100) = blokScore × genormaliseerdeWeging × 10
4) totaalScore(0–100) = Σ eindBlok`}</pre>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">4) Eindwaardering (sterren)</h2>
            <div className="grid gap-2 text-sm text-slate-600">
              <div className="card p-3 flex items-center justify-between"><span>⭐⭐⭐⭐⭐</span><span>≥ 100</span></div>
              <div className="card p-3 flex items-center justify-between"><span>⭐⭐⭐⭐</span><span>≥ 75</span></div>
              <div className="card p-3 flex items-center justify-between"><span>⭐⭐⭐</span><span>≥ 60</span></div>
              <div className="card p-3 flex items-center justify-between"><span>⭐⭐</span><span>≥ 40</span></div>
              <div className="card p-3 flex items-center justify-between"><span>⭐</span><span>&lt; 40</span></div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link className="btn" to="/suppliers">← Terug naar leveranciers</Link>
        </div>
      </div>
    </div>
  );
}
