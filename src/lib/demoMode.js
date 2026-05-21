import { DEMO_SUPPLIERS } from "./governanceCockpit";

const KEY = "vendorscore_demo_mode";
const GOV_PREFIX = "VENDORSCORE_GOV_";

export function isDemoMode() {
  try {
    return window?.localStorage?.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function setDemoMode(enabled) {
  try {
    window?.localStorage?.setItem(KEY, enabled ? "true" : "false");

    if (!enabled) {
      const storage = window?.localStorage;
      if (storage) {
        const keysToRemove = [];
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (key && key.startsWith(GOV_PREFIX)) keysToRemove.push(key);
        }
        keysToRemove.forEach((key) => storage.removeItem(key));
      }
    }
  } catch {
    // ignore
  }
}

export function getSupplierSourceRows(realRows) {
  if (isDemoMode()) return DEMO_SUPPLIERS;
  return realRows || [];
}
