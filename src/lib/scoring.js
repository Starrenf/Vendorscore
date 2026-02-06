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
