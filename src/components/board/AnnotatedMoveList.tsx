"use client";

import { useEffect, useRef } from "react";
import type { MoveAnalysis, MoveClassification } from "@/types";

interface AnnotatedMoveListProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

const CLASSIFICATION_META: Record<MoveClassification, { glyph: string; color: string; label: string }> = {
  best: { glyph: "★", color: "text-emerald-400", label: "Best" },
  good: { glyph: "✓", color: "text-sky-400", label: "Good" },
  inaccuracy: { glyph: "?!", color: "text-yellow-400", label: "Inaccuracy" },
  mistake: { glyph: "?", color: "text-orange-400", label: "Mistake" },
  blunder: { glyph: "??", color: "text-rose-400", label: "Blunder" },
  missed_win: { glyph: "✗", color: "text-purple-400", label: "Missed Win" },
};

export function AnnotatedMoveList({ moves, currentPly, onSelectPly }: AnnotatedMoveListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const active = activeRef.current;
    if (!container || !active) return;

    const activeTop = active.offsetTop;
    const activeBottom = activeTop + active.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (activeTop < viewTop) {
      container.scrollTop = activeTop;
    } else if (activeBottom > viewBottom) {
      container.scrollTop = activeBottom - container.clientHeight;
    }
  }, [currentPly]);

  const pairs: Array<{ moveNumber: number; white: MoveAnalysis | null; black: MoveAnalysis | null }> = [];
  for (const move of moves) {
    if (move.color === "w") {
      pairs.push({ moveNumber: move.moveNumber, white: move, black: null });
    } else {
      const last = pairs[pairs.length - 1];
      if (last && last.moveNumber === move.moveNumber) {
        last.black = move;
      } else {
        pairs.push({ moveNumber: move.moveNumber, white: null, black: move });
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col gap-0.5 overflow-y-auto px-2 py-2 text-sm"
    >
      {pairs.map((pair) => (
        <div key={pair.moveNumber} className="grid grid-cols-[2.25rem_1fr_1fr] items-center gap-1">
          <span className="text-right text-xs font-bold text-[var(--chess-cream-muted)]">
            {pair.moveNumber}.
          </span>
          {pair.white ? (
            <MoveCell
              move={pair.white}
              isActive={pair.white.ply === currentPly}
              onSelect={onSelectPly}
              activeRef={pair.white.ply === currentPly ? activeRef : undefined}
            />
          ) : (
            <span />
          )}
          {pair.black ? (
            <MoveCell
              move={pair.black}
              isActive={pair.black.ply === currentPly}
              onSelect={onSelectPly}
              activeRef={pair.black.ply === currentPly ? activeRef : undefined}
            />
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

function MoveCell({
  move,
  isActive,
  onSelect,
  activeRef,
}: {
  move: MoveAnalysis;
  isActive: boolean;
  onSelect: (ply: number) => void;
  activeRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const meta = CLASSIFICATION_META[move.classification];
  return (
    <button
      ref={activeRef}
      onClick={() => onSelect(move.ply)}
      className={`flex items-center justify-between gap-1 rounded-md px-2 py-1 text-left font-semibold transition ${
        isActive
          ? "bg-[var(--chess-green)]/22 text-[var(--chess-cream)]"
          : "text-[var(--chess-cream)] hover:bg-white/[0.08]"
      }`}
      title={meta.label}
    >
      <span className="truncate">{move.san}</span>
      <span className={`shrink-0 text-xs font-black ${meta.color}`}>{meta.glyph}</span>
    </button>
  );
}
