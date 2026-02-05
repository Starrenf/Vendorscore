import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase as getSupabase, resetSupabaseClient } from "../lib/supabase";
import { getRuntimeConfig } from "../lib/runtimeConfig";

const AppCtx = createContext(null);

export function AppStateProvider({ children }) {
  const [session, setSession] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const sb = getSupabase();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      const cfg = getRuntimeConfig();
      if (!cfg.url || !cfg.anonKey) {
        setSession(null);
        setOrganization(null);
        setLoading(false);
        return;
      }
      const client = getSupabase();
      if (!client) {
        setLoading(false);
        return;
      }
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      setSession(data.session ?? null);

      const { data: listener } = client.auth.onAuthStateChange((_event, s) => {
        setSession(s);
      });

      // Always prefer the org stored on the user's profile.
      // This avoids "ghost" org selections from localStorage that can cause
      // confusing behaviour for new users (and, in some setups, RLS recursion).
      if (data.session) {
        const { data: prof, error: profErr } = await client
          .from("profiles")
          .select("organization_id")
          .eq("id", data.session.user.id)
          .maybeSingle();

        if (!profErr && prof?.organization_id) {
          const { data: org, error: orgErr } = await client
            .from("organizations")
            .select("id,name,display_name,slug")
            .eq("id", prof.organization_id)
            .maybeSingle();

          if (!orgErr && org) {
            setOrganization(org);
            window.localStorage.setItem("VENDORSCORE_ORG_ID", org.id);
          }
        } else {
          // Not linked yet: clear any stale local selection.
          window.localStorage.removeItem("VENDORSCORE_ORG_ID");
          setOrganization(null);
        }
      }

      setLoading(false);
      return () => listener?.subscription?.unsubscribe();
    }

    init();
    return () => { cancelled = true; };
  }, [sb?.auth]);

  function setOrg(org) {
    setOrganization(org);
    if (org?.id) window.localStorage.setItem("VENDORSCORE_ORG_ID", org.id);
    else window.localStorage.removeItem("VENDORSCORE_ORG_ID");
  }

  async function signOut() {
    const client = getSupabase();
    if (!client) return;
    await client.auth.signOut();
    setOrg(null);
  }

  function hardResetClient() {
    resetSupabaseClient();
    window.location.reload();
  }

  const value = useMemo(() => ({
    session,
    organization,
    setOrg,
    loading,
    signOut,
    hardResetClient,
  }), [session, organization, loading]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp must be used within AppStateProvider");
  return v;
}
