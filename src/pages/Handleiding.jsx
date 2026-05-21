import PartnerSchoolsStrip from "../components/PartnerSchoolsStrip";
export default function Handleiding() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="card p-6">
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm font-medium text-slate-600">
          Nieuwe gebruikers
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Handleiding account aanmaken en koppelen aan een organisatie
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-700">
          Gebruik deze stappen als je voor het eerst inlogt in VendorScore Pro. Nieuwe gebruikers worden niet automatisch aan een school gekoppeld.
          Eerst maak je zelf een account aan. Daarna stuur je een e-mail naar Frank zodat je aan de juiste school of organisatie gekoppeld kunt worden.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/docs/VendorScore_Handleiding_Nieuwe_Gebruikers.docx"
            className="btn btn-primary"
            download
          >
            Download handleiding (Word)
          </a>
          <a
            href="mailto:f.starren@rocgilde.nl?subject=Aanvraag%20toegang%20VendorScore%20Pro"
            className="btn"
          >
            Mail Frank voor koppeling
          </a>
        </div>
      </section>

      <PartnerSchoolsStrip compact />

      <section className="card p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Stap 1 · Account aanmaken</h2>
          <ol className="mt-2 list-decimal pl-5 space-y-2 text-slate-700 leading-7">
            <li>Open VendorScore Pro en kies <b>Account aanmaken</b>.</li>
            <li>Vul je zakelijke e-mailadres in.</li>
            <li>Kies een wachtwoord en bewaar dit op een veilige plek.</li>
            <li>Klik op <b>Account aanmaken</b>.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">Stap 2 · E-mail naar Frank</h2>
          <p className="mt-2 text-slate-700 leading-7">
            Na het aanmaken van je account stuur je een e-mail naar Frank Starren. Vermeld daarin aan welke school of organisatie je gekoppeld moet worden.
          </p>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Voorbeeld e-mail</div>
            <div className="mt-2 font-mono text-xs leading-6">
              Onderwerp: Aanvraag toegang VendorScore Pro
              <br />
              Beste Frank,
              <br />
              Ik heb een account aangemaakt in VendorScore Pro.
              <br />
              Graag wil ik gekoppeld worden aan: [naam school / organisatie].
              <br />
              Met vriendelijke groet,
              <br />
              [naam]
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">Stap 3 · Koppelmail ontvangen</h2>
          <p className="mt-2 text-slate-700 leading-7">
            Frank stuurt je daarna een persoonlijke invite-link of koppelcode. Deze is specifiek voor jouw organisatie.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">Stap 4 · Organisatie koppelen</h2>
          <ol className="mt-2 list-decimal pl-5 space-y-2 text-slate-700 leading-7">
            <li>Open de invite-link uit de e-mail.</li>
            <li>Log in als dat gevraagd wordt.</li>
            <li>Je account wordt automatisch gekoppeld aan de juiste organisatie.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">Daarna kun je</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2 text-slate-700 leading-7">
            <li>leveranciers bekijken;</li>
            <li>beoordelingen openen of aanmaken;</li>
            <li>scores, motivatie en governance-informatie invullen.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
