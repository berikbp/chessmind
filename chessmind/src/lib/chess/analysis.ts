import type { MoveAnalysis, MoveClassification } from "@/types";

export const MATE_SCORE = 10000;

export interface ClassifyInput {
  cpLoss: number;
  evalBeforePlayer: number;
  evalAfterPlayer: number;
  playedMatchesBest: boolean;
}

export function classifyMove({
  cpLoss,
  evalBeforePlayer,
  evalAfterPlayer,
  playedMatchesBest,
}: ClassifyInput): MoveClassification {
  if (playedMatchesBest) return "best";
  if (evalBeforePlayer > 200 && evalAfterPlayer < 50) return "missed_win";
  if (cpLoss <= 10) return "best";
  if (cpLoss <= 25) return "good";
  if (cpLoss <= 75) return "inaccuracy";
  if (cpLoss <= 150) return "mistake";
  return "blunder";
}

function winChance(cp: number): number {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

function moveAccuracyValue(winChanceBefore: number, winChanceAfter: number): number {
  const winLoss = Math.max(0, winChanceBefore - winChanceAfter);
  const acc = 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

export function computeAccuracy(
  moves: MoveAnalysis[],
  evalsWhitePerspective: number[],
): { whiteAccuracy: number; blackAccuracy: number } {
  const whiteAccs: number[] = [];
  const blackAccs: number[] = [];

  for (let i = 0; i < moves.length; i++) {
    const wcBefore = winChance(evalsWhitePerspective[i]);
    const wcAfter = winChance(evalsWhitePerspective[i + 1]);

    if (moves[i].color === "w") {
      whiteAccs.push(moveAccuracyValue(wcBefore, wcAfter));
    } else {
      blackAccs.push(moveAccuracyValue(100 - wcBefore, 100 - wcAfter));
    }
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100);
  return {
    whiteAccuracy: Math.round(avg(whiteAccs) * 10) / 10,
    blackAccuracy: Math.round(avg(blackAccs) * 10) / 10,
  };
}

export function evalToWhitePercent(cp: number): number {
  return winChance(cp);
}

export function formatEval(cp: number, mateIn: number | null): string {
  if (mateIn !== null) return `M${Math.abs(mateIn)}`;
  if (cp >= MATE_SCORE - 100) return "M+";
  if (cp <= -MATE_SCORE + 100) return "M-";
  const pawns = cp / 100;
  return (pawns >= 0 ? "+" : "") + pawns.toFixed(2);
}
