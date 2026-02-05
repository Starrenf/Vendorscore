import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import Notice from "../components/Notice";
import { useApp } from "../state/AppState";
import { Link, useLocation, useNavigate } from "react-router-dom";

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminOrganizations() {
  const { session } = useApp();
  const client = supabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    id: null,
    display_name: "",
    slug: "",
    is_public: true,
    join_code: "",
  });

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const adminTabs = useMemo(() => ([
    { to: "/admin/orgs", label: "Organisaties", active: pathname.startsWith("/admin/orgs") },
    { to: "/admin/weights", label: "Wegingen", active: pathname.startsWith("/admin/weights") },
  ]), [pathname]);

  useEffect(() => {
    async function run() {
      setErr("");
      setLoading(true);
      if (!session || !client) { setLoading(false); return; }

      // determine admin
      const { data: prof, error: profErr } = await client
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profErr) {
        setErr(profErr.message);
        setLoading(false);
        return;
      }
      setIsAdmin(!!prof?.is_admin);

      // load organizations (admin should see all; if policy doesn't allow, show actionable message)
      const { data, error } = await client
        .from("organizations")
        .select("id,name,display_name,slug,is_public,join_code,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErr(error.message + " — Tip: voeg een admin SELECT policy toe op organizations (zie supabase/sql_patch_admin_select.sql).");
        setRows([]);
      } else {
        setRows(data ?? []);
      }

      setLoading(false);
    }

    run();
  }, [session, client]);

  function startNew() {
    setForm({ id: null, display_name: "", slug: "", is_public: true, join_code: randomCode(8) });
  }

  function startEdit(r) {
    setForm({
      id: r.id,
      display_name: r.display_name ?? r.name ?? "",
      slug: r.slug ?? "",
      is_public: !!r.is_public,
      join_code: r.join_code ?? "",
    });
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setErr("");
    if (!client) return;
    if (!session) { setErr("Je bent niet ingelogd."); return; }
    if (!isAdmin) { setErr("Je bent geen admin (profiles.is_admin = false)."); return; }

    const display_name = (form.display_name || "").trim();
    const slug = (form.slug || "").trim().toLowerCase();
    if (!display_name) { setErr("Display name is verplicht."); return; }
    if (!slug) { setErr("Slug is verplicht."); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setErr("Slug mag alleen letters/cijfers en koppeltekens bevatten (bijv. gilde-opleidingen).");
      return;
    }

    const payload = {
      name: display_name,
      display_name,
      slug,
      is_public: !!form.is_public,
      join_code: (form.join_code || "").trim() || null,
    };

    if (form.id) {
      const { error } = await client.from("organizations").update(payload).eq("id", form.id);
      if (error) { setErr(error.message); return; }
    } else {
      const { error } = await client.from("organizations").insert(payload);
      if (error) { setErr(error.message); return; }
    }

    // reload
    const { data, error } = await client
      .from("organizations")
      .select("id,name,display_name,slug,is_public,join_code,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
    } else {
      setRows(data ?? []);
      // keep editing the newly created item? simplest: reset form
      startNew();
    }
  }

  async function remove(id) {
    if (!client) return;
    if (!isAdmin) { setErr("Je bent geen admin."); return; }
    const ok = window.confirm("Weet je zeker dat je deze organisatie wilt verwijderen?");
    if (!ok) return;
    const { error } = await client.from("organizations").delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    setRows((r) => r.filter((x) => x.id !== id));
    if (form.id === id) startNew();
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
  }

  const joinLink = useMemo(() => {
    const code = (form.join_code || "").trim();
    if (!code) return "";
    const base = window.location.origin;
    return `${base}/onboarding?code=${encodeURIComponent(code)}`;
  }, [form.join_code]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-slate-600 text-sm">Beheer organisaties en onboarding (FSR-ready).</p>
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

      {err ? <Notice type="error">{err}</Notice> : null}

      {!session ? (
        <Notice type="info">
          Je bent niet ingelogd. Ga naar <Link className="underline" to="/login">Login</Link>.
        </Notice>
      ) : null}

      {session && !loading && !isAdmin ? (
        <Notice type="warning">
          Je account is niet als admin gemarkeerd. Zet in Supabase <code>profiles.is_admin</code> op <code>true</code> voor jouw user.
        </Notice>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{form.id ? "Organisatie bewerken" : "Nieuwe organisatie"}</h2>
            <div className="flex gap-2">
              <button
                onClick={startNew}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
              >
                Nieuw
              </button>
              <button
                onClick={() => setField("join_code", randomCode(8))}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                title="Genereer join-code"
              >
                Genereer code
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Display name *</span>
              <input
                className="border rounded-lg px-3 py-2"
                value={form.display_name}
                onChange={(e) => setField("display_name", e.target.value)}
                placeholder="Gilde Opleidingen"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium">Slug *</span>
              <input
                className="border rounded-lg px-3 py-2"
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="gilde-opleidingen"
              />
              <span className="text-xs text-slate-500">Alleen a-z, 0-9 en koppeltekens.</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.is_public}
                onChange={(e) => setField("is_public", e.target.checked)}
              />
              <span className="text-sm">Publiek zichtbaar in onboarding-lijst</span>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium">Join-code</span>
              <input
                className="border rounded-lg px-3 py-2"
                value={form.join_code}
                onChange={(e) => setField("join_code", e.target.value)}
                placeholder="GILDE2026"
              />
            </label>

            {joinLink ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Join-link</div>
                  <button
                    className="text-sm underline"
                    onClick={() => copy(joinLink)}
                    type="button"
                  >
                    Kopieer
                  </button>
                </div>
                <div className="text-sm break-all text-slate-700 mt-1">{joinLink}</div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={save}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                disabled={!session || !client || loading}
              >
                Opslaan
              </button>
              {form.id ? (
                <button
                  onClick={() => remove(form.id)}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                  type="button"
                >
                  Verwijderen
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Organisaties</h2>
            <div className="text-sm text-slate-500">{rows.length} totaal</div>
          </div>

          {loading ? (
            <div className="text-slate-500">Laden…</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{r.display_name ?? r.name ?? r.slug}</div>
                      <div className="text-sm text-slate-600">slug: <code>{r.slug}</code></div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                        <span className={"px-2 py-1 rounded-full border " + (r.is_public ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-600 bg-white")}>
                          {r.is_public ? "public" : "private"}
                        </span>
                        {r.join_code ? (
                          <span className="px-2 py-1 rounded-full border border-slate-200 text-slate-700 bg-white">
                            code: <code>{r.join_code}</code>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-white text-sm"
                        onClick={() => startEdit(r)}
                      >
                        Bewerken
                      </button>
                      {r.join_code ? (
                        <button
                          className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-white text-sm"
                          onClick={() => copy(`${window.location.origin}/onboarding?code=${encodeURIComponent(r.join_code)}`)}
                        >
                          Kopieer link
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {rows.length === 0 ? (
                <div className="text-slate-500">Geen organisaties gevonden.</div>
              ) : null}
            </div>
          )}

          <Notice type="info">
            Tip: je kunt organisaties ook in Supabase Table Editor beheren. Deze pagina is vooral voor snelle onboarding (FSR demo).
          </Notice>
        </div>
      </div>
    </div>
  );
}
