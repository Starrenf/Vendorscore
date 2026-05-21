import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase as getSupabase, resetSupabaseClient } from "../lib/supabase";
import { getRuntimeConfig } from "../lib/runtimeConfig";

const AppCtx = createContext(null);

export function AppStateProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const sb = getSupabase();

  function clearAuthAndState(reason) {
    try {
      window?.localStorage?.removeItem("VENDORSPRO_ORG_ID");
      window?.localStorage?.removeItem("vendorscorepro-auth");
    } catch {
      // ignore
    }

    // Reset singleton client to avoid reusing a poisoned refresh token
    try {
      resetSupabaseClient();
    } catch {
      // ignore
    }

    setSession(null);
    setOrganization(null);

    // Optional hard redirect to break any render/route loops.
    // Only do this when we are not already on /login.
    try {
      const path = window?.location?.pathname || "";
      if (!path.startsWith("/login")) {
        window.location.href = `/login?reason=${encodeURIComponent(reason || "session")}`;
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(client, userId) {
      if (!client || !userId) return null;
      const { data, error } = await client
        .from("profiles")
        // profiles table schema: no 'email' column
        .select("id, organization_id, role, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Failed to load profile", error);
        return null;
      }
      return data || null;
    }

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

      const { data, error: sessionErr } = await client.auth.getSession();
      if (sessionErr) {
        // Common when a stale/invalid refresh_token is cached. Fail-safe: clear and force re-login.
        clearAuthAndState(sessionErr?.message || "refresh_token");
        setLoading(false);
        return;
      }
      if (cancelled) return;

      setSession(data.session ?? null);

      const { data: listener } = client.auth.onAuthStateChange((event, s) => {
        try {
          // If token refresh fails (common when a stale/rotated refresh token is cached),
          // immediately clear state so the UI doesn't "pretend" saves worked.
          if (event === "TOKEN_REFRESH_FAILED") {
            setSession(null);
            setOrganization(null);
            window.localStorage.removeItem("VENDORSPRO_ORG_ID");
            // Also clear the auth cache key we configured on the client.
            window.localStorage.removeItem("vendorscorepro-auth");
            return;
          }

          if (event === "SIGNED_OUT") {
            setProfile(null);
            setOrganization(null);
            window.localStorage.removeItem("VENDORSPRO_ORG_ID");
          }

          setSession(s);

          // Refresh profile in the background when session changes.
          if (s?.user?.id) {
            loadProfile(client, s.user.id).then((p) => {
              if (!cancelled) setProfile(p);
            });
          } else {
            setProfile(null);
          }
        } catch (e) {
          // ultra defensive: never let auth listener crash the app
          clearAuthAndState(e?.message || "auth_listener");
        }
      });

      // Always prefer the org stored on the user's profile.
      // This avoids "ghost" org selections from localStorage that can cause confusing behaviour.
      if (data.session) {
        const prof = await loadProfile(client, data.session.user.id);
        if (!cancelled) setProfile(prof);

        let orgId = prof?.organization_id || null;

        if (!orgId) {
          const { data: membership } = await client
            .from("org_memberships")
            .select("organization_id, role")
            .eq("user_id", data.session.user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (membership?.organization_id) {
            orgId = membership.organization_id;
            if (!cancelled) {
              setProfile((prev) => ({
                ...(prev || { id: data.session.user.id }),
                organization_id: membership.organization_id,
                role: prev?.role || membership.role || "member",
                full_name: prev?.full_name || null,
              }));
            }
          }
        }

        if (orgId) {
          const { data: org, error: orgErr } = await client
            .from("organizations")
            .select("id,name")
            .eq("id", orgId)
            .maybeSingle();

          if (!orgErr && org) {
            setOrganization(org);
            window.localStorage.setItem("VENDORSPRO_ORG_ID", org.id);
          } else {
            window.localStorage.removeItem("VENDORSPRO_ORG_ID");
            setOrganization(null);
          }
        } else {
          // Not linked yet: clear any stale local selection.
          window.localStorage.removeItem("VENDORSPRO_ORG_ID");
          setOrganization(null);
        }
      }

      setLoading(false);
      return () => listener?.subscription?.unsubscribe();
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [sb?.auth]);

  function setOrg(org) {
    setOrganization(org);
    if (org?.id) window.localStorage.setItem("VENDORSPRO_ORG_ID", org.id);
    else window.localStorage.removeItem("VENDORSPRO_ORG_ID");
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

  const value = useMemo(
    () => ({
      session,
      profile,
      organization,
      setOrg,
      loading,
      signOut,
      hardResetClient,
    }),
    [session, profile, organization, loading]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp must be used within AppStateProvider");
  return v;
}
