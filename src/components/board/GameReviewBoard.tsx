"use client";

import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { Chessboard } from "react-chessboard";

import type { GameAnalysis, MoveAnalysis } from "@/types";

import { EvalBar } from "./EvalBar";

interface GameReviewBoardProps {
  analysis: GameAnalysis;
  currentPly: number;
  onChangePly: (ply: number) => void;
  orientation: "white" | "black";
  startingFen: string;
}

const BOARD_SIZE_STYLE = {
  "--review-board-size": "min(520px, calc(100vw - 64px), calc(100svh - 220px))",
} as CSSProperties;

export function GameReviewBoard({
  analysis,
  currentPly,
  onChangePly,
  orientation,
  startingFen,
}: GameReviewBoardProps) {
  const totalPlies = analysis.moves.length;
  const currentMove: MoveAnalysis | null = currentPly > 0 ? analysis.moves[currentPly - 1] : null;
  const currentFen = currentMove ? currentMove.fenAfter : startingFen;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChangePly(Math.max(0, currentPly - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChangePly(Math.min(totalPlies, currentPly + 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        onChangePly(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onChangePly(totalPlies);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPly, totalPlies, onChangePly]);

  const arrows = useMemo(() => {
    if (!currentMove) return [];
    const out: { startSquare: string; endSquare: string; color: string }[] = [];
    const isPoor =
      currentMove.classification === "mistake" ||
      currentMove.classification === "blunder" ||
      currentMove.classification === "missed_win";
    out.push({
      startSquare: currentMove.playedUci.slice(0, 2),
      endSquare: currentMove.playedUci.slice(2, 4),
      color: isPoor ? "rgba(244, 63, 94, 0.65)" : "rgba(168, 207, 106, 0.6)",
    });
    if (
      isPoor &&
      currentMove.bestMoveUci &&
      currentMove.bestMoveUci !== currentMove.playedUci
    ) {
      out.push({
        startSquare: currentMove.bestMoveUci.slice(0, 2),
        endSquare: currentMove.bestMoveUci.slice(2, 4),
        color: "rgba(201, 168, 76, 0.85)",
      });
    }
    return out;
  }, [currentMove]);

  const cpForBar = currentMove ? currentMove.evalAfter : 0;
  const mateInForBar = currentMove?.isMate ? currentMove.mateIn : null;

  return (
    <div
      className="flex items-stretch gap-2"
      style={{ ...BOARD_SIZE_STYLE, width: "calc(var(--review-board-size) + 28px)" }}
    >
      <EvalBar
        cpWhitePerspective={cpForBar}
        mateIn={mateInForBar}
        orientation={orientation}
        height="var(--review-board-size)"
      />
      <div
        className="relative overflow-hidden rounded-[14px] border border-[var(--chess-border)] shadow-[0_22px_60px_rgba(0,0,0,0.38)]"
        style={{
          width: "var(--review-board-size)",
          height: "var(--review-board-size)",
        }}
      >
        <Chessboard
          options={{
            position: currentFen,
            boardOrientation: orientation,
            arrows,
            boardStyle: { borderRadius: "14px" },
            darkSquareStyle: { backgroundColor: "#7a4f28" },
            lightSquareStyle: { backgroundColor: "#ead7b4" },
            animationDurationInMs: 120,
            allowDrawingArrows: false,
          }}
        />
      </div>
    </div>
  );
}
