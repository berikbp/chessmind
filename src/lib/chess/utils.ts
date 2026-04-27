const K = 32;

export function calculateNewRating(
  playerRating: number,
  opponentRating: number,
  actualScore: number,
): { newRating: number; change: number } {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const change = Math.round(K * (actualScore - expected));
  const newRating = Math.max(100, playerRating + change);
  return { newRating, change };
}
