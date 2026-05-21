import { useEffect, useMemo, useState } from "react";
import Notice from "../components/Notice";
import { supabase } from "../lib/supabase";
import { useApp } from "../state/AppState";
import DemoModeToggle from "../components/DemoModeToggle";

function randomCode(length = 10) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function toSlug(input) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminOrganizations() {
  const { profile, session } = useApp();
  const client = supabase();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [invites, setInvites] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMaxUses, setInviteMaxUses] = useState(50);
  const [inviteDaysValid, setInviteDaysValid] = useState(30);

  const canUse = profile?.role === "admin";

  const selectedOrg = useMemo(
    () => orgs.find((o) => o.id === selectedOrgId) || null,
    [orgs, selectedOrgId]
  );

  useEffect(() => {
    setSlug(toSlug(name));
  }, [name]);

  async function loadOrgs() {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await client
        .from("organizations")
        .select("id,name,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrgs(data || []);
      if (!selectedOrgId && data?.length) setSelectedOrgId(data[0].id);
    } catch (e) {
      setErr(e.message || "Kon organisaties niet laden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadInvites(orgId) {
    if (!orgId) {
      setInvites([]);
      return;
    }
    setInviteLoading(true);
    setErr("");
    try {
      const { data, error } = await client
        .from("org_invites")
        .select("id,code,created_by,uses,max_uses,expires_at,created_at,revoked")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvites(data || []);
    } catch (e) {
      setInvites([]);
      setErr(e.message || "Kon invites niet laden.");
    } finally {
      setInviteLoading(false);
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    loadInvites(selectedOrgId);
  }, [selectedOrgId]);

  async function createOrg() {
    setErr("");
    setOk("");
    try {
      const cleaned = { name: name.trim() };
      if (!cleaned.name) throw new Error("Naam is verplicht.");

      const { error } = await client.from("organizations").insert(cleaned);
      if (error) throw error;
      setOk("Organisatie aangemaakt.");
      setName("");
      setSlug("");
      await loadOrgs();
    } catch (e) {
      setErr(e.message || "Kon organisatie niet aanmaken.");
    }
  }

  async function createInvite() {
    if (!selectedOrgId) return;
    setErr("");
    setOk("");
    try {
      const currentUserId = session?.user?.id;
      if (!currentUserId) throw new Error("Geen ingelogde gebruiker gevonden.");

      const code = randomCode(10);
      const days = Math.max(1, Number(inviteDaysValid || 30));
      const maxUses = Math.max(1, Number(inviteMaxUses || 1));
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await client.from("org_invites").insert({
        organization_id: selectedOrgId,
        code,
        created_by: currentUserId,
        max_uses: maxUses,
        expires_at: expiresAt,
      });
      if (error) throw error;
      setOk("Invite aangemaakt.");
      await loadInvites(selectedOrgId);
    } catch (e) {
      setErr(e.message || "Kon invite niet aanmaken.");
    }
  }

  async function revokeInvite(inviteId) {
    setErr("");
    setOk("");
    try {
      const { error } = await client
        .from("org_invites")
        .update({ revoked: true, expires_at: new Date().toISOString() })
        .eq("id", inviteId);
      if (error) throw error;
      setOk("Invite ingetrokken.");
      await loadInvites(selectedOrgId);
    } catch (e) {
      setErr(e.message || "Kon invite niet intrekken.");
    }
  }

  function inviteLink(code) {
    return `${window.location.origin}/onboarding?code=${encodeURIComponent(code)}`;
  }

  function getUsedCount(inv) {
    return Number(inv?.used_count ?? inv?.uses ?? 0);
  }

  if (!canUse) {
    return (
      <div className="max-w-2xl">
        <Notice type="warn" title="Geen toegang">
          Deze pagina is alleen beschikbaar voor admins.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Admin · Organisaties</h1>
        <p className="text-sm text-slate-600 mt-1">
          Veilig aansluiten van nieuwe medewerkers gaat via <b>invites</b> (tijdelijke codes). Slugs blijven intern.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Demo modus (FSR congres)</div>
            <div className="text-xs text-slate-600">
              Gebruik deze knop alleen voor demo's. Zet hem hier uit zodra je met echte leveranciersdata werkt.
            </div>
          </div>
          <DemoModeToggle />
        </div>

        {err && (
          <div className="mt-4">
            <Notice type="error" title="Fout">
              {err}
            </Notice>
          </div>
        )}
        {ok && (
          <div className="mt-4">
            <Notice type="success" title="OK">
              {ok}
            </Notice>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold">Nieuwe organisatie</h2>
          <div className="grid gap-3 mt-4">
            <label className="block">
              <span className="text-sm font-medium">Naam</span>
              <input
                className="input mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bijv. Gilde Opleidingen"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Slug</span>
              <input
                className="input mt-1"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="gilde-opleidingen"
              />
              <p className="text-xs text-slate-500 mt-1">Wordt gebruikt voor interne herkenning, niet meer voor joinen.</p>
            </label>
            <button className="btn btn-primary" onClick={createOrg} disabled={loading}>
              Organisatie aanmaken
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Bestaande organisaties</h2>
          {loading ? (
            <p className="text-sm text-slate-600 mt-3">Laden…</p>
          ) : (
            <div className="mt-4 space-y-3">
              <select
                className="input"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {selectedOrg && (
                <div className="text-xs text-slate-500">
                  <div>Naam: <span className="font-mono">{selectedOrg.name}</span></div>
                  <div>Id: <span className="font-mono">{selectedOrg.id}</span></div>
                </div>
              )}
              <button className="btn" onClick={loadOrgs}>
                Verversen
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Invites</h2>
        <p className="text-sm text-slate-600 mt-1">
          Maak een invite aan en deel de link met een collega. De ingelogde admin wordt opgeslagen als <span className="font-mono">created_by</span>.
        </p>

        <div className="grid gap-3 mt-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium">Geldig (dagen)</span>
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={inviteDaysValid}
              onChange={(e) => setInviteDaysValid(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Max. uses</span>
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={inviteMaxUses}
              onChange={(e) => setInviteMaxUses(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={createInvite} disabled={!selectedOrgId}>
              Invite aanmaken
            </button>
          </div>
        </div>

        <div className="mt-4">
          {inviteLoading ? (
            <p className="text-sm text-slate-600">Laden…</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-slate-600">Nog geen invites voor deze organisatie.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Aangemaakt door</th>
                    <th className="py-2 pr-4">Uses</th>
                    <th className="py-2 pr-4">Vervalt</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => {
                    const expired = !!inv.revoked || (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now());
                    const used = getUsedCount(inv);
                    const status = !!inv.revoked
                      ? "Ingetrokken"
                      : expired
                        ? "Verlopen"
                        : used >= Number(inv.max_uses || 0)
                          ? "Op"
                          : "Actief";
                    return (
                      <tr key={inv.id} className="border-t">
                        <td className="py-2 pr-4 font-mono">{inv.code}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{inv.created_by || "—"}</td>
                        <td className="py-2 pr-4">
                          {used}/{inv.max_uses}
                        </td>
                        <td className="py-2 pr-4">
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2 pr-4">{status}</td>
                        <td className="py-2 space-x-2">
                          <button
                            className="btn btn-sm"
                            onClick={() => navigator.clipboard.writeText(inviteLink(inv.code))}
                          >
                            Copy link
                          </button>
                          {!expired && (
                            <button className="btn btn-sm" onClick={() => revokeInvite(inv.id)}>
                              Intrekken
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
