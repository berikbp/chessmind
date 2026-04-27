"use client";

import { useEffect, useRef } from "react";
import type { Move } from "chess.js";

interface MoveHistoryProps {
  history: Move[];
  onSelectMove: (fen: string) => void;
}

export function MoveHistory({ history, onSelectMove }: MoveHistoryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep auto-scroll inside the move panel. `scrollIntoView()` can scroll the
  // whole page and pull the board down after every move.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [history.length]);

  if (history.length === 0) {
    return (
      <div className="flex min-h-40 flex-1 items-center justify-center rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4 text-sm font-semibold text-[var(--chess-cream-muted)]">
        No moves yet
      </div>
    );
  }

  // Group into [white, black?] pairs
  const pairs: { move: number; white: Move; black: Move | undefined }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ move: i / 2 + 1, white: history[i]!, black: history[i + 1] });
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex min-h-0 max-h-72 flex-1 flex-col overflow-y-auto overscroll-contain rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18"
    >
      <div className="sticky top-0 border-b border-[var(--chess-border)] bg-[#21180f]/88 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--chess-gold)] backdrop-blur">
        Moves
      </div>
      <div className="divide-y divide-[var(--chess-border)]">
        {pairs.map(({ move, white, black }) => (
          <div key={move} className="flex items-center text-sm">
            <span className="w-10 shrink-0 pl-4 text-xs font-bold text-[var(--chess-cream-muted)]">
              {move}.
            </span>
            <button
              onClick={() => onSelectMove(white.after)}
              className="focus-ring flex-1 px-2 py-2 text-left font-semibold text-[var(--chess-cream)] transition hover:bg-white/[0.07]"
            >
              {white.san}
            </button>
            {black ? (
              <button
                onClick={() => onSelectMove(black.after)}
                className="focus-ring flex-1 px-2 py-2 text-left font-semibold text-[var(--chess-cream)] transition hover:bg-white/[0.07]"
              >
                {black.san}
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
