import { Link } from "react-router-dom";
import Notice from "../components/Notice";
import { getRuntimeConfig } from "../lib/runtimeConfig";
import { useApp } from "../state/AppState";

export default function Home() {
  const { session, organization } = useApp();
  const cfg = getRuntimeConfig();

  return (
    <div className="space-y-4">
      <div className="section-card">
        <div className="section-head">
          <div>
            <h1 className="page-title">Welkom</h1>
            <p className="page-subtitle mt-1">Leveranciers beoordelen, helder en consistent.</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="badge">Gilde stijl</span>
            <span className="badge">K1–K5</span>
          </div>
        </div>
        <div className="p-6">
        <p className="mt-2 text-slate-700">
          VendorScore helpt je leveranciers objectief te beoordelen op basis van K1–K5 criteria en de Excel-wegingsmatrix.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {!session ? <Link className="btn btn-primary" to="/login">Inloggen</Link> : null}
          {!organization ? (
            <Link className="btn" to="/org">Organisatie kiezen</Link>
          ) : (
            <Link className="btn" to="/suppliers">Naar leveranciers</Link>
          )}
          <Link className="btn" to="/settings">Runtime config</Link>
          <Link className="btn" to="/onboarding">Onboarding</Link>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          Config bron: <span className="badge">{cfg.source}</span>
        </div>
      </div>
      </div>

      <Notice title="Nieuwe medewerker? (account + join via slug)">
        Volg de stappen in <Link className="underline" to="/onboarding">/onboarding</Link>.
        <div className="mt-2 text-sm text-slate-700">
          Korte versie: maak een account (tab <b>Account</b> op <span className="font-mono">/login</span>) en open daarna de
          join-link: <span className="font-mono">/join/&lt;slug&gt;</span> (bijv. <span className="font-mono">/join/gilde</span>).
        </div>
      </Notice>
    </div>
  );
}
