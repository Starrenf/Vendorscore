export const RATING_TO_FACTOR = {
  Uitstekend: 1,
  Goed: 0.8,
  Redelijk: 0.6,
  Matig: 0.4,
  Slecht: 0,
};

export function ratingToFactor(rating) {
  return RATING_TO_FACTOR[rating] ?? 0;
}

export function calculateBlockM(scores) {
  // scores: [{score, maxScore}] -> 0..10
  const sum = scores.reduce((a, s) => a + (Number(s.score) || 0), 0);
  const max = scores.reduce((a, s) => a + (Number(s.maxScore) || 0), 0);
  if (!max) return 0;
  return (sum / max) * 10;
}

export function totalScoreToStars(total) {
  if (total >= 100) return 5;
  if (total >= 75) return 4;
  if (total >= 60) return 3;
  if (total >= 40) return 2;
  return 1;
}


// Compute total score (0..100) based on criteria sections, saved scores and weight config.
// - sections: { K1: [{id, points_max}], ... }
// - scores: { [criteria_id]: { score } }
// - weightByBlock: { K1: number, ... } weights 0..20
export function calculateTotalScore({ sections, scores, weightByBlock }) {
  const blocks = Object.keys(sections || {}).sort();
  const rawWeights = blocks.map((b) => Number(weightByBlock?.[b] ?? 0));
  const totalRaw = rawWeights.reduce((a, n) => a + n, 0) || 1;
  const norm = Object.fromEntries(blocks.map((b, i) => [b, rawWeights[i] / totalRaw]));

  let total = 0;
  for (const b of blocks) {
    const cs = sections[b] || [];
    let sum = 0, max = 0;
    for (const c of cs) {
      const row = scores?.[c.id];
      sum += Number(row?.score) || 0;
      max += Number(c.points_max) || 0;
    }
    const M = max ? (sum / max) * 10 : 0;
    const O = M * (norm[b] || 0) * 10;
    total += O;
  }
  return { total: Math.round(total * 10) / 10, norm };
}
