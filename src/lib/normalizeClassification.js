/**
 * Normalize supplier classification to values accepted by DB:
 *  - Strategisch
 *  - Knelpunt
 *  - Hefboom
 *  - Routine
 * or null.
 *
 * Accepts variants like "Strategische leverancier", "strategic", etc.
 */
export function normalizeClassification(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const v = raw.toLowerCase();

  // allow labels like "Strategische leverancier"
  if (v.includes("strateg")) return "Strategisch";
  if (v.includes("knelpunt") || v.includes("bottleneck")) return "Knelpunt";
  if (v.includes("hefboom") || v.includes("leverage")) return "Hefboom";
  if (v.includes("routine")) return "Routine";

  return null;
}
