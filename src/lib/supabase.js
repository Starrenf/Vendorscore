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
  _client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _client;
}

export function resetSupabaseClient() {
  _client = null;
}
