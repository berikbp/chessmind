import type { Color, Move, Square } from "chess.js";

const LIGHT_SQ = "#f0d9b5";
const DARK_SQ = "#b58863";
const LAST_MOVE_LIGHT = "rgba(240, 197, 106, 0.45)";
const LAST_MOVE_DARK = "rgba(240, 197, 106, 0.34)";
const SELECTED_COLOR = "rgba(240, 197, 106, 0.55)";
const CHECK_COLOR = "#e63c3c";
const CAPTURE_RING = "inset 0 0 0 4px rgba(240,197,106,0.55)";

function isLightSquare(sq: string): boolean {
  const file = sq.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(sq[1], 10);
  return (file + rank) % 2 !== 0;
}

function sqColor(sq: string): string {
  return isLightSquare(sq) ? LIGHT_SQ : DARK_SQ;
}

/** Returns the set of occupied squares from a FEN string. */
function parseFenOccupied(fen: string): Set<string> {
  const occupied = new Set<string>();
  const rows = fen.split(" ")[0].split("/");
  const files = "abcdefgh";

  for (let ri = 0; ri < 8; ri++) {
    let fi = 0;
    for (const ch of rows[ri]) {
      if (ch >= "1" && ch <= "8") {
        fi += +ch;
      } else {
        occupied.add(`${files[fi]}${8 - ri}`);
        fi++;
      }
    }
  }
  return occupied;
}

/** Returns the square of the king of the given color. */
export function findKingSquare(fen: string, color: Color): Square | null {
  const target = color === "w" ? "K" : "k";
  const rows = fen.split(" ")[0].split("/");
  const files = "abcdefgh";

  for (let ri = 0; ri < 8; ri++) {
    let fi = 0;
    for (const ch of rows[ri]) {
      if (ch >= "1" && ch <= "8") {
        fi += +ch;
      } else {
        if (ch === target) return `${files[fi]}${8 - ri}` as Square;
        fi++;
      }
    }
  }
  return null;
}

interface StyleParams {
  fen: string;
  selectedSquare: Square | null;
  legalMoves: Move[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  turn: Color;
}

export function buildSquareStyles({
  fen,
  selectedSquare,
  legalMoves,
  lastMove,
  isCheck,
  turn,
}: StyleParams): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};
  const occupied = parseFenOccupied(fen);

  // Last move highlight
  if (lastMove) {
    styles[lastMove.from] = { background: isLightSquare(lastMove.from) ? LAST_MOVE_LIGHT : LAST_MOVE_DARK };
    styles[lastMove.to] = { background: isLightSquare(lastMove.to) ? LAST_MOVE_LIGHT : LAST_MOVE_DARK };
  }

  // Legal move targets
  for (const move of legalMoves) {
    const sq = move.to;
    if (occupied.has(sq)) {
      // Opponent piece on this square — show a ring, keep the last-move color if present
      const base = (styles[sq] as { background?: string } | undefined)?.background ?? sqColor(sq);
      styles[sq] = { background: base, boxShadow: CAPTURE_RING };
    } else {
      // Empty target — green dot (Lichess style)
      styles[sq] = {
        background: `radial-gradient(circle, rgba(240,197,106,0.45) 24%, transparent 25%)`,
      };
    }
  }

  // Selected square (overrides last-move, but not check)
  if (selectedSquare) {
    styles[selectedSquare] = { background: SELECTED_COLOR };
  }

  // King in check (highest priority)
  if (isCheck) {
    const king = findKingSquare(fen, turn);
    if (king) styles[king] = { background: CHECK_COLOR };
  }

  return styles;
}
