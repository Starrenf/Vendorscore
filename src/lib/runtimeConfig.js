const LS_URL_KEY = "VENDORSCORE_SUPABASE_URL";
const LS_ANON_KEY = "VENDORSCORE_SUPABASE_ANON_KEY";

export function getRuntimeConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Production: only env vars. We intentionally DO NOT fall back to localStorage,
  // so colleagues never need to store API config locally.
  if (import.meta.env.PROD) {
    const url = envUrl || "";
    const anonKey = envKey || "";
    return { url, anonKey, source: envUrl && envKey ? "env" : "missing_env" };
  }

  // Development: allow localStorage fallback for easy testing on multiple devices.
  const lsUrl = typeof window !== "undefined" ? window.localStorage.getItem(LS_URL_KEY) : null;
  const lsKey = typeof window !== "undefined" ? window.localStorage.getItem(LS_ANON_KEY) : null;

  const url = envUrl || lsUrl || "";
  const anonKey = envKey || lsKey || "";

  return {
    url,
    anonKey,
    source: envUrl && envKey ? "env" : lsUrl && lsKey ? "localStorage" : "missing",
  };
}

export function setRuntimeConfig({ url, anonKey }) {
  // Only allowed in development. In production we keep config centralized via Vercel env vars.
  if (import.meta.env.PROD) return;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_URL_KEY, url);
  window.localStorage.setItem(LS_ANON_KEY, anonKey);
}

export function clearRuntimeConfig() {
  if (import.meta.env.PROD) return;
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_URL_KEY);
  window.localStorage.removeItem(LS_ANON_KEY);
}
