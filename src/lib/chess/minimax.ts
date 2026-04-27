import { Chess } from "chess.js";
import { evaluate } from "./evaluation";

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluate(game);
  }

  const moves = game.moves();

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function getBestMoveMinmax(game: Chess, depth: number): string | null {
  const moves = game.moves();
  if (moves.length === 0) return null;

  const isWhite = game.turn() === "w";
  let bestMove: string | null = null;
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
    game.undo();

    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
