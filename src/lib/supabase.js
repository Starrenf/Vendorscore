import { createClient } from "@supabase/supabase-js";
import { getRuntimeConfig } from "./runtimeConfig";

let _client = null;

export function supabase() {
  if (_client) return _client;

  const { url, anonKey } = getRuntimeConfig();
  if (!url || !anonKey) {
    // client will be created later after user enters runtime config
    return null;
  }
  // IMPORTANT:
  // - Create the client exactly once (singleton) to avoid token-refresh races.
  // - Use an explicit storageKey so the session is stable across deploys.
  // - Explicitly use localStorage for persistence.
  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window?.localStorage,
      storageKey: "vendorscore-auth",
    },
  });
  return _client;
}

export function resetSupabaseClient() {
  _client = null;
  try {
    window?.localStorage?.removeItem("vendorscore-auth");
  } catch {
    // ignore
  }
}
