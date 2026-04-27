import { defaultPieces } from "react-chessboard";
import type { PieceSymbol } from "chess.js";

interface CapturedPiecesProps {
  /** Captured piece types (always lowercase from chess.js) */
  pieces: PieceSymbol[];
  /** The color of the captured pieces (used to pick the correct glyph) */
  pieceColor: "w" | "b";
}

const PIECE_ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

export function CapturedPieces({ pieces, pieceColor }: CapturedPiecesProps) {
  const sorted = [...pieces].sort(
    (a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b),
  );

  return (
    <div className="flex h-5 items-center gap-0.5 overflow-hidden rounded-lg border border-[var(--chess-border)] bg-black/10 px-1.5">
      {sorted.map((symbol, i) => {
        const key = `${pieceColor}${symbol.toUpperCase()}` as keyof typeof defaultPieces;
        const Piece = defaultPieces[key];
        return Piece ? (
          <span key={i} className="inline-block h-4 w-4 shrink-0 opacity-90">
            <Piece svgStyle={{ width: "100%", height: "100%" }} />
          </span>
        ) : null;
      })}
    </div>
  );
}
