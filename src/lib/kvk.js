// Helpers for Dutch Chamber of Commerce (KVK) numbers.
// KVK numbers are 8 digits. We store them as text in the database.

/**
 * Normalize KVK input to digits-only (max 8 chars).
 * Returns an empty string when input is empty.
 */
export function normalizeKvk(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  return digits.slice(0, 8);
}

/**
 * Checks whether a normalized KVK value is valid (exactly 8 digits).
 */
export function isValidKvk(normalized) {
  return /^\d{8}$/.test(String(normalized ?? ''));
}
