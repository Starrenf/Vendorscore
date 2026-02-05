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

      // restore org selection
      const orgId = window.localStorage.getItem("VENDORSCORE_ORG_ID");
      if (orgId && data.session) {
        const { data: org, error } = await client
          .from("organizations")
          .select("id,name,slug")
          .eq("id", orgId)
          .maybeSingle();

        if (!error && org) setOrganization(org);
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
