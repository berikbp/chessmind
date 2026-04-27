"use client";

import { defaultPieces } from "react-chessboard";
import type { Color, PieceSymbol } from "chess.js";

interface PromotionDialogProps {
  color: Color;
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

const PROMOTION_PIECES: PieceSymbol[] = ["q", "r", "b", "n"];
const PIECE_LABELS: Record<string, string> = { q: "Queen", r: "Rook", b: "Bishop", n: "Knight" };

export function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] bg-black/65 backdrop-blur-sm">
      <div className="card-surface flex flex-col items-center gap-3 rounded-[1.75rem] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--chess-gold)]">
          Promote pawn
        </p>
        <div className="flex gap-2">
          {PROMOTION_PIECES.map((piece) => {
            const key = `${color}${piece.toUpperCase()}` as keyof typeof defaultPieces;
            const Piece = defaultPieces[key];
            return (
              <button
                key={piece}
                onClick={() => onSelect(piece)}
                title={PIECE_LABELS[piece]}
                className="focus-ring flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-[var(--chess-border)] bg-white/[0.055] transition hover:border-[var(--chess-gold)]/60 hover:bg-[var(--chess-gold)]/10"
              >
                {Piece && (
                  <span className="h-10 w-10">
                    <Piece svgStyle={{ width: "100%", height: "100%" }} />
                  </span>
                )}
                <span className="mt-0.5 text-[10px] font-semibold text-[var(--chess-cream-muted)]">
                  {PIECE_LABELS[piece]}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onCancel}
          className="focus-ring rounded-lg px-2 py-1 text-xs font-semibold text-[var(--chess-cream-muted)] underline underline-offset-2 hover:text-[var(--chess-cream)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
