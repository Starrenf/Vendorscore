import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { ToastProvider } from "./ToastProvider";
import { useApp } from "../state/AppState";

function OrbLogo() {
  return (
    <div className="vs-orb-wrap relative h-12 w-12 shrink-0 lg:h-14 lg:w-14" aria-hidden="true">
      <div className="vs-orb-shadow" />
      <div className="vs-orb-ring vs-orb-ring-back" />
      <div className="vs-orb-3d" />
      <div className="vs-orb-logo-shell">
        <img src="/logo-vendorscore-icon.png" alt="" className="vs-orb-logo-mark" />
      </div>
      <div className="vs-orb-ring vs-orb-ring-front" />
      <div className="vs-orb-core-glow" />
      <div className="vs-orb-highlight" />
    </div>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const pathname = location.pathname;
  const nav = useNavigate();
  const { session, organization, signOut, loading, profile } = useApp();
  const isAdmin = Boolean(profile?.role === "admin");

  const primaryMenu = useMemo(
    () => [
      { to: "/", label: "Home", active: pathname === "/" },
      { to: "/dashboard", label: "Dashboard", active: pathname.startsWith("/dashboard") },
      { to: "/suppliers", label: "Leveranciers", active: pathname.startsWith("/suppliers") },
      { to: "/methodiek", label: "Governance", active: pathname.startsWith("/methodiek") },
    ],
    [pathname]
  );

  const secondaryMenu = useMemo(
    () => [
      { to: "/status", label: "Status", active: pathname.startsWith("/status") },
      { to: "/over", label: "Over", active: pathname.startsWith("/over") },
      { to: "/handleiding", label: "Handleiding", active: pathname.startsWith("/handleiding") },
      ...(isAdmin ? [{ to: "/admin/orgs", label: "Admin", active: pathname.startsWith("/admin") }] : []),
      { to: "/onboarding", label: "Onboarding", active: pathname.startsWith("/onboarding") },
    ],
    [pathname, isAdmin]
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [bgOffset, setBgOffset] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setBgOffset(y * 0.15);
      setIsScrolled(y > 6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDesktopMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (loading || !session) return;

    const path = location?.pathname || "/";
    const allowed = ["/login", "/settings", "/onboarding", "/org", "/join"].some(
      (p) => path === p || path.startsWith(p + "/")
    );
    if (allowed) return;

    if (!organization) {
      nav("/onboarding");
    }
  }, [loading, session, organization, location?.pathname, nav]);

  const orgLabel = organization?.name || "Geen organisatie geselecteerd";

  return (
    <ToastProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-900">
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url('/background.jpg')", transform: `translateY(${bgOffset}px) scale(1.03)` }}
        />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(92,187,255,0.18),transparent_20%),linear-gradient(135deg,rgba(8,27,55,0.88),rgba(11,42,79,0.92)_45%,rgba(16,58,108,0.88))]" />

        <header
          className="sticky top-0 z-20 border-b border-white/10 text-white backdrop-blur-md"
          style={{
            background: isScrolled
              ? "linear-gradient(90deg, rgba(9,32,65,0.94) 0%, rgba(12,54,104,0.95) 40%, rgba(10,37,72,0.94) 100%)"
              : "linear-gradient(90deg, rgba(12,44,92,0.88) 0%, rgba(12,54,104,0.90) 48%, rgba(8,29,60,0.88) 100%)",
          }}
        >
          <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-2.5 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_auto] lg:gap-6 lg:px-6">
            <div className="flex min-w-0 items-center gap-3.5 lg:gap-4.5">
              <OrbLogo />
              <div className="min-w-0 max-w-[280px] lg:max-w-[320px]">
                <div className="text-[1.55rem] font-extrabold leading-none tracking-tight text-white lg:text-[1.7rem]">
                  VendorScore Pro
                </div>
                <div className="mt-1 hidden max-w-[260px] text-[10px] font-semibold uppercase leading-[1.2] tracking-[0.16em] text-cyan-100/78 sm:block lg:max-w-[300px]">
                  Leveranciersmanagement &amp; governance
                </div>
                <div className="mt-1.5 text-[11px] leading-tight text-white/68 lg:max-w-[300px]">
                  {organization ? (
                    <span className="inline-flex max-w-full items-center rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[11px] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <span className="mr-1.5 text-white/52">Organisatie</span>
                      <span className="truncate font-semibold text-white/92">{orgLabel}</span>
                    </span>
                  ) : (
                    "Nog niet gekoppeld aan een organisatie"
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex min-w-0 items-center justify-center gap-2.5 xl:gap-3">
              <nav className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-2.5 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md xl:gap-2 xl:px-3 xl:py-2">
                {primaryMenu.map((item) => (
                  <Link key={item.to} className={"navbtn" + (item.active ? " navbtn-active" : "")} to={item.to}>
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="relative">
                <button
                  type="button"
                  className={"navbtn" + (secondaryMenu.some((item) => item.active) ? " navbtn-active" : "")}
                  onClick={() => setDesktopMoreOpen((v) => !v)}
                >
                  Meer
                  <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {desktopMoreOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-56 rounded-2xl border border-white/10 bg-[rgba(8,27,55,0.96)] p-2 shadow-2xl backdrop-blur-xl">
                    {secondaryMenu.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={
                          "block rounded-xl px-4 py-2.5 text-sm font-semibold no-underline transition " +
                          (item.active ? "bg-white text-[#0c4f9f]" : "text-white/85 hover:bg-white/10 hover:text-white")
                        }
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2.5 justify-self-end">
              {session ? (
                <button className="navbtn" onClick={signOut}>Uitloggen</button>
              ) : (
                <Link className={"navbtn" + (pathname.startsWith("/login") ? " navbtn-active" : "")} to="/login">
                  Login
                </Link>
              )}
            </div>

            <button
              className="inline-flex items-center justify-center justify-self-end rounded-2xl border border-white/25 bg-white/8 p-2.5 transition hover:bg-white/12 lg:hidden"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {mobileOpen ? (
            <div className="fixed inset-0 z-30 lg:hidden">
              <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" onClick={() => setMobileOpen(false)} />
              <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col border-l border-white/15 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-4 text-slate-900 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <OrbLogo />
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold">VendorScore Pro</div>
                      <div className="truncate text-xs text-slate-600">{orgLabel}</div>
                    </div>
                  </div>
                  <button className="btn" onClick={() => setMobileOpen(false)}>Sluiten</button>
                </div>

                <div className="grid gap-2 py-4">
                  {[...primaryMenu, ...secondaryMenu].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={
                        "w-full rounded-2xl border px-4 py-3 font-semibold transition no-underline " +
                        (item.active
                          ? "border-[#0c4f9f] bg-[#E8F0FB] text-[#0c4f9f] shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50")
                      }
                    >
                      {item.label}
                    </Link>
                  ))}
                  {isAdmin ? (
                    <Link
                      to="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold hover:bg-slate-50"
                    >
                      Instellingen
                    </Link>
                  ) : null}
                </div>

                <div className="mt-auto border-t border-slate-200 pt-4">
                  {session ? (
                    <button className="btn btn-primary w-full" onClick={() => { setMobileOpen(false); signOut(); }}>
                      Uitloggen
                    </button>
                  ) : (
                    <Link className="btn btn-primary w-full" to="/login" onClick={() => setMobileOpen(false)}>
                      Login
                    </Link>
                  )}
                  <div className="mt-3 text-xs leading-relaxed text-slate-500">
                    Nieuwe gebruikers maken eerst zelf een account aan en sturen daarna een mail naar Frank voor koppeling aan de juiste school.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</main>

        <footer className="border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-sm text-slate-600 md:grid-cols-3 md:items-center lg:px-6">
            <div className="order-2 md:order-1">© {new Date().getFullYear()} VendorScore Pro</div>

            <div className="order-1 flex flex-col items-start gap-2 md:order-2 md:items-center">
              <div className="flex items-center gap-3">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/methodiek">Governance</Link>
                <Link to="/onboarding">Onboarding</Link>
                <Link to="/handleiding">Handleiding</Link>
              </div>
            </div>

            <div className="order-3 flex flex-wrap gap-4 md:justify-end">
              <a href="https://supabase.com" target="_blank" rel="noreferrer">Supabase</a>
              <a href="https://vercel.com" target="_blank" rel="noreferrer">Vercel</a>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
