import { Link, useLocation } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { ToastProvider } from "./ToastProvider";
import { useApp } from "../state/AppState";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { session, organization, signOut } = useApp();

  const menu = useMemo(() => ([
  { to: "/", label: "Home", active: pathname === "/" },
  { to: "/suppliers", label: "Leveranciers", active: pathname.startsWith("/suppliers") },
  { to: "/methodiek", label: "Methodiek", active: pathname.startsWith("/methodiek") },
  { to: "/admin/orgs", label: "Admin", active: pathname.startsWith("/admin") },
  { to: "/onboarding", label: "Onboarding", active: pathname.startsWith("/onboarding") },
]), [pathname]);

const [mobileOpen, setMobileOpen] = useState(false);

return (
  <ToastProvider>
  <div className="relative min-h-screen overflow-x-hidden">
      {/* Parallax background */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/background.jpg')", transform: `translateY(${bgOffset}px)` }}
      />
      {/* Overlay for readability */}
      <div className="fixed inset-0 -z-10 bg-slate-900/75" />

    <header className="sticky top-0 z-20 bg-[#003A8F] text-white border-b border-[#002f70]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo-vendorscore.png" alt="VendorScore" className="h-10 w-auto shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold leading-5 tracking-tight truncate">VendorScore</div>
            <div className="text-xs text-white/80 truncate">
              {organization ? <>Org: <span className="font-medium">{organization.name}</span></> : "Geen organisatie geselecteerd"}
            </div>
          </div>
        </div>

        {/* Desktop nav + partner logos */}
        <div className="hidden md:flex items-center gap-3">
          <nav className="flex items-center gap-2">
            {menu.map((item) => (
              <Link key={item.to} className={"navbtn" + (item.active ? " navbtn-active" : "")} to={item.to}>
                {item.label}
              </Link>
            ))}
            {session ? (
              <button className="navbtn" onClick={signOut}>Uitloggen</button>
            ) : (
              <Link className={"navbtn" + (pathname.startsWith("/login") ? " navbtn-active" : "")} to="/login">Login</Link>
            )}
          </nav>

          <div className="h-7 w-px bg-white/20" />

          <div className="flex items-center gap-3">
            <a
              href="https://www.rocnederland.nl"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-1 hover:bg-white/10 transition"
              title="ROC Nederland"
            >
              <img src="/logos/roc-nederland.png" alt="ROC Nederland" className="h-8 w-auto" />
            </a>
            <a
              href="https://www.mboraad.nl"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-1 hover:bg-white/10 transition"
              title="MBO Raad"
            >
              <img src="/logos/mbo-raad.png" alt="MBO Raad" className="h-8 w-auto" />
            </a>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-xl p-2 border border-white/25 hover:bg-white/10"
          aria-label="Menu"
          onClick={() => setMobileOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white text-slate-900 shadow-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                <img src="/logo-vendorscore.png" alt="VendorScore" className="h-9 w-auto" />
                <div className="min-w-0">
                  <div className="font-semibold truncate">Menu</div>
                  <div className="text-xs text-slate-600 truncate">
                    {organization ? organization.name : "Geen organisatie"}
                  </div>
                </div>
              </div>
              <button className="btn" onClick={() => setMobileOpen(false)}>Sluiten</button>
            </div>

            <div className="py-4 grid gap-2">
              {menu.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={"w-full rounded-xl px-4 py-3 font-semibold border transition " + (item.active ? "bg-[#E8F0FB] border-[#003A8F] text-[#003A8F]" : "bg-white border-slate-200 hover:bg-slate-50")}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-xl px-4 py-3 font-semibold border bg-white border-slate-200 hover:bg-slate-50"
              >
                Instellingen
              </Link>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-200">
              {session ? (
                <button className="btn btn-primary w-full" onClick={() => { setMobileOpen(false); signOut(); }}>
                  Uitloggen
                </button>
              ) : (
                <Link className="btn btn-primary w-full" to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
              )}
              <div className="text-xs text-slate-500 mt-3">
                Tip: voeg je organisatie toe via <span className="font-mono">/join/&lt;slug&gt;</span>.
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-2"> </div>
                <div className="flex items-center gap-3">
                  <img src="/logos/roc-nederland.png" alt="ROC Nederland" className="h-7 w-auto" />
                  <img src="/logos/mbo-raad.png" alt="MBO Raad" className="h-7 w-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>

    <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-slate-600 grid gap-4 md:grid-cols-3 md:items-center">
          <div className="order-2 md:order-1">© {new Date().getFullYear()} VendorScore</div>

          <div className="order-1 md:order-2 flex flex-col items-start md:items-center gap-2">
            <div className="text-xs text-slate-500"> </div>
            <div className="flex items-center gap-3">
              <a href="https://www.rocnederland.nl" target="_blank" rel="noreferrer" className="hover:opacity-90">
                <img src="/logos/roc-nederland.png" alt="ROC Nederland" className="h-7 w-auto" />
              </a>
              <a href="https://www.mboraad.nl" target="_blank" rel="noreferrer" className="hover:opacity-90">
                <img src="/logos/mbo-raad.png" alt="MBO Raad" className="h-7 w-auto" />
              </a>
            </div>
          </div>

          <div className="order-3 flex gap-4 md:justify-end flex-wrap">
            <Link to="/methodiek">Methodiek</Link>
            <Link to="/onboarding">Onboarding</Link>
            <a href="https://supabase.com" target="_blank" rel="noreferrer">Supabase</a>
            <a href="https://vercel.com" target="_blank" rel="noreferrer">Vercel</a>
          </div>
        </div>
      </footer>
    </div>
    </ToastProvider>
    );

}
