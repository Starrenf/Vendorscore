import { useMemo, useState } from "react";

const sections = [
  {
    id: "doel",
    title: "1. Doel van dit document",
    body: `Dit document beschrijft welke contractdocumentatie noodzakelijk is voor professioneel contractmanagement van ICT-leveranciers en hoe leveranciers worden geclassificeerd volgens de Kraljic-methodiek.

Doelen:
- contractdossiers uniform opbouwen
- inzicht krijgen in scope, risico’s en governance
- leveranciers classificeren op strategisch belang en leveringsrisico
- contractmanagementinspanning richten waar deze het meeste effect heeft

Dit document vormt een referentiekader voor contractbeheer binnen de organisatie.`
  },
  {
    id: "hoofdcontract",
    title: "2. Hoofdcontract",
    body: `Doel
Het hoofdcontract vormt de juridische basis van de samenwerking tussen opdrachtgever en leverancier.

Inhoud
- contractnummer
- contracttitel
- leverancier
- juridische entiteit
- contactpersonen
- contracteigenaar
- contractmanager
- scope van het contract
- beschrijving van de dienstverlening
- relatie met SLA, DAB en DAP
- contractduur, verlengopties en opzegtermijn
- financiële afspraken, indexering en facturatie
- aansprakelijkheid, intellectueel eigendom en geheimhouding
- exit-regeling, dataoverdracht en migratieondersteuning`
  },
  {
    id: "sla",
    title: "3. Service Level Agreement (SLA)",
    body: `Doel
De SLA beschrijft de kwaliteit van de dienstverlening.

Inhoud
- uptime percentages
- servicevensters
- onderhoudsvensters
- prioriteiten P1–P4
- responstijden en oplostijden
- KPI’s voor beschikbaarheid, performance en responstijden
- maandrapportages en kwartaalreviews
- servicecredits bij niet behalen van servicelevels`
  },
  {
    id: "dab",
    title: "4. Dienst Afbakening Beschrijving (DAB)",
    body: `Doel
De DAB beschrijft wat exact onder de dienstverlening valt.

Inhoud
- doel van de dienst
- type dienstverlening
- scope: applicaties, systemen en infrastructuur
- taken leverancier: beheer, monitoring en onderhoud
- taken opdrachtgever: functioneel beheer, autorisaties en changeverzoeken
- afbakening: wat buiten de dienstverlening valt`
  },
  {
    id: "dap",
    title: "5. Dienst Afspraken Plan (DAP)",
    body: `Doel
De DAP beschrijft hoe de samenwerking tussen leverancier en opdrachtgever wordt georganiseerd.

Governance structuur
- operationeel overleg: maandelijks
- service review: kwartaal
- strategisch overleg: jaarlijks

Verder bevat de DAP:
- rollen en verantwoordelijkheden
- incidentproces en escalatieprocedure
- changemanagement, RFC-proces en CAB-overleg
- contactpersonen en communicatiekanalen`
  },
  {
    id: "avg",
    title: "6. Verwerkersovereenkomst (AVG)",
    body: `Doel
Regelt hoe persoonsgegevens worden verwerkt volgens de AVG.

Inhoud
- type persoonsgegevens
- categorie betrokkenen
- doel van verwerking
- opslag en verwerking
- securitymaatregelen zoals encryptie en toegangsbeheer
- subverwerkers
- datalekprocedure, meldplicht en responstijd`
  },
  {
    id: "security",
    title: "7. Security- en compliance afspraken",
    body: `Inhoud
- securitybeleid en ISO-certificering
- security framework
- authenticatie en autorisatie
- encryptie en back-ups
- disaster recovery en business continuity`
  },
  {
    id: "financieel",
    title: "8. Financiële bijlagen",
    body: `Inhoud
- prijzenblad met tarieven, licenties en volumekorting
- factuurfrequentie en factuurstructuur
- indexering en jaarlijkse prijsaanpassing`
  },
  {
    id: "exit",
    title: "9. Exit-regeling",
    body: `Doel
Zorgen dat een contract gecontroleerd kan worden beëindigd.

Inhoud
- overdracht data en exportformaat
- data-eigendom
- overdracht dienstverlening
- migratieondersteuning en kennisoverdracht
- termijnen en overgangsperiode`
  },
  {
    id: "kraljic",
    title: "10. Leveranciersclassificatie volgens de Kraljic-methode",
    body: `Doel
De Kraljic-matrix helpt organisaties bepalen hoe belangrijk een leverancier is en hoeveel risico de levering heeft.

Categorieën
- Strategisch: hoge impact en hoog risico
- Hefboom: hoge impact maar laag risico
- Knelpunt: lage impact maar hoog risico
- Routine: lage impact en laag risico

Gebruik in contractmanagement
- Strategisch: intensief governance model
- Hefboom: focus op kosten en prestaties
- Knelpunt: risicomanagement
- Routine: administratief beheer`
  },
  {
    id: "checklist",
    title: "11. Contractgovernance checklist",
    body: `Voor een compleet contractdossier moeten minimaal aanwezig zijn:
- Hoofdcontract
- SLA
- DAB
- DAP
- Verwerkersovereenkomst
- Security afspraken
- Prijzenblad
- Exit regeling`
  }
];

function containsText(section, q) {
  const haystack = `${section.title}\n${section.body}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export default function Methodiek() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    return sections.filter((section) => containsText(section, search));
  }, [search]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg backdrop-blur">
            <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm font-medium text-slate-600">
              Referentiekader contractmanagement
            </div>
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900">
              Contract Governance & Methodiek
            </h1>
            <p className="mb-5 max-w-3xl text-lg leading-8 text-slate-600">
              Overzicht van vereiste contractdocumentatie, governance en leveranciersclassificatie volgens de Kraljic-methode.
            </p>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek in documentatie..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 md:max-w-md"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                {filtered.length} onderdelen zichtbaar
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                Zoekbaar
              </span>
            </div>
          </section>

          {filtered.map((section) => (
            <section
              id={section.id}
              key={section.id}
              className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg backdrop-blur"
            >
              <h2 className="mb-4 text-2xl font-semibold text-slate-900">{section.title}</h2>
              <pre className="whitespace-pre-wrap text-left font-sans text-base leading-8 text-slate-700">
                {section.body}
              </pre>
            </section>
          ))}

          {filtered.length === 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg">
              <h2 className="mb-2 text-xl font-semibold text-slate-900">Geen resultaten</h2>
              <p className="text-slate-600">Probeer een andere zoekterm, bijvoorbeeld SLA, DAP, exit of Kraljic.</p>
            </section>
          )}
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-lg backdrop-blur">
            <h2 className="mb-4 text-2xl font-bold text-blue-800">Snel naar</h2>
            <nav className="space-y-3">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-xl font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
