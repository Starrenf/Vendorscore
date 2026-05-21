/**
 * Central place for reading Supabase config.
 *
 * ✅ Production/Vercel: comes from build-time env vars
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 * 🛠 Local/dev fallback (ONLY when env vars are missing):
 *   - localStorage keys: VENDORSPRO_SUPABASE_URL / VENDORSPRO_SUPABASE_ANON_KEY
 */

const LS_URL = "VENDORSPRO_SUPABASE_URL";
const LS_KEY = "VENDORSPRO_SUPABASE_ANON_KEY";

function normalizeValue(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).trim();
  }
  return v;
}

function readEnv() {
  return {
    url: normalizeValue(import.meta.env.VITE_SUPABASE_URL || ""),
    anonKey: normalizeValue(import.meta.env.VITE_SUPABASE_ANON_KEY || ""),
  };
}

function safeGetLS(key) {
  try {
    return normalizeValue(window?.localStorage?.getItem(key) || "");
  } catch {
    return "";
  }
}

function safeSetLS(key, value) {
  try {
    if (!value) window?.localStorage?.removeItem(key);
    else window?.localStorage?.setItem(key, normalizeValue(value));
  } catch {
    // ignore
  }
}

export function getRuntimeConfig() {
  const env = readEnv();
  if (env.url && env.anonKey) return env;

  return {
    url: env.url || safeGetLS(LS_URL),
    anonKey: env.anonKey || safeGetLS(LS_KEY),
  };
}

export function setRuntimeConfig({ url, anonKey } = {}) {
  const env = readEnv();
  if (env.url && env.anonKey) return;

  safeSetLS(LS_URL, url || "");
  safeSetLS(LS_KEY, anonKey || "");
}

export function clearRuntimeConfig() {
  safeSetLS(LS_URL, "");
  safeSetLS(LS_KEY, "");
}

export const SUPABASE_URL = readEnv().url;
export const SUPABASE_ANON_KEY = readEnv().anonKey;
