/**
 * Central place for reading Supabase config.
 *
 * ✅ Production/Vercel: comes from build-time env vars
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 * 🛠 Local/dev fallback (ONLY when env vars are missing):
 *   - localStorage keys: VENDORSCORE_SUPABASE_URL / VENDORSCORE_SUPABASE_ANON_KEY
 *
 * This keeps Vercel clean/stable (no runtime overrides affecting deployed builds),
 * while still letting you run locally without having to set env vars every time.
 */

const LS_URL = "VENDORSCORE_SUPABASE_URL";
const LS_KEY = "VENDORSCORE_SUPABASE_ANON_KEY";

function readEnv() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || "",
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

function safeGetLS(key) {
  try {
    return window?.localStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeSetLS(key, value) {
  try {
    if (!value) window?.localStorage?.removeItem(key);
    else window?.localStorage?.setItem(key, value);
  } catch {
    // ignore
  }
}

/** Return a normalized config object. */
export function getRuntimeConfig() {
  const env = readEnv();
  if (env.url && env.anonKey) return env;

  // Only fall back to localStorage if env vars are not available.
  return {
    url: env.url || safeGetLS(LS_URL),
    anonKey: env.anonKey || safeGetLS(LS_KEY),
  };
}

// Backwards-compatible exports used by Settings.jsx
export function setRuntimeConfig({ url, anonKey } = {}) {
  // We never override valid env vars.
  const env = readEnv();
  if (env.url && env.anonKey) return;

  safeSetLS(LS_URL, url || "");
  safeSetLS(LS_KEY, anonKey || "");
}

export function clearRuntimeConfig() {
  safeSetLS(LS_URL, "");
  safeSetLS(LS_KEY, "");
}

// Convenience named exports (some older files import these)
export const SUPABASE_URL = readEnv().url;
export const SUPABASE_ANON_KEY = readEnv().anonKey;
