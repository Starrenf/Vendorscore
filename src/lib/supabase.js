import { createClient } from "@supabase/supabase-js";
import { getRuntimeConfig } from "./runtimeConfig";

let _client = null;

function createSupabaseClient() {
  const { url, anonKey } = getRuntimeConfig();
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    // Defensive: ensure the anon key is always sent as `apikey`.
    // This avoids PostgREST 400 "No API key found" errors if a client is ever
    // created from an empty/misread key (env/runtime config edge cases).
    global: {
      headers: {
        apikey: anonKey,
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "vendorscorepro-auth",
    },
  });
}

/**
 * Get a singleton Supabase client.
 * Returns null when config is missing (e.g. local dev without env vars).
 */
export function supabase() {
  if (!_client) _client = createSupabaseClient();
  return _client;
}

/** Clear the singleton so we can recreate it (useful after auth corruption). */
export function resetSupabaseClient() {
  _client = null;
}
