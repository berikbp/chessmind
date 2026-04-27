"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";

import { classifyMove, computeAccuracy, MATE_SCORE } from "@/lib/chess/analysis";
import type { GameAnalysis, MoveAnalysis } from "@/types";

import { type PositionEvaluation, useStockfishAnalysis } from "./useStockfishAnalysis";

export type AnalysisStatus = "idle" | "preparing" | "analyzing" | "complete" | "error";

export interface AnalysisProgress {
  done: number;
  total: number;
}

interface UseGameAnalysisOptions {
  pgn: string | null;
  enabled?: boolean;
  depth?: number;
}

function toCentipawns(evaluation: PositionEvaluation): number {
  if (evaluation.mateIn !== null) {
    const sign = evaluation.mateIn >= 0 ? 1 : -1;
    return sign * (MATE_SCORE - Math.abs(evaluation.mateIn));
  }
  return evaluation.scoreCp ?? 0;
}

function uciFromMove(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

function countClassifications(moves: MoveAnalysis[]) {
  const counts = {
    blunders: { white: 0, black: 0 },
    mistakes: { white: 0, black: 0 },
    inaccuracies: { white: 0, black: 0 },
  };
  for (const move of moves) {
    const side = move.color === "w" ? "white" : "black";
    if (move.classification === "blunder" || move.classification === "missed_win") {
      counts.blunders[side]++;
    } else if (move.classification === "mistake") {
      counts.mistakes[side]++;
    } else if (move.classification === "inaccuracy") {
      counts.inaccuracies[side]++;
    }
  }
  return counts;
}

export function useGameAnalysis({ pgn, enabled = true, depth = 15 }: UseGameAnalysisOptions) {
  const { evaluatePosition, isReady } = useStockfishAnalysis({ enabled, depth });
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [progress, setProgress] = useState<AnalysisProgress>({ done: 0, total: 0 });
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!pgn || !isReady || runningRef.current) return;
    runningRef.current = true;
    cancelledRef.current = false;
    setStatus("preparing");
    setError(null);
    setAnalysis(null);

    let chess: Chess;
    try {
      chess = new Chess();
      chess.loadPgn(pgn, { strict: false });
    } catch {
      setError("Could not parse this game's PGN.");
      setStatus("error");
      runningRef.current = false;
      return;
    }

    const history = chess.history({ verbose: true });
    if (history.length === 0) {
      setError("This game has no moves to analyze.");
      setStatus("error");
      runningRef.current = false;
      return;
    }

    const positions: { fen: string; sideToMove: "w" | "b" }[] = [];
    const replay = new Chess();
    positions.push({ fen: replay.fen(), sideToMove: replay.turn() });
    for (const move of history) {
      replay.move(move.san);
      positions.push({ fen: replay.fen(), sideToMove: replay.turn() });
    }

    const total = positions.length;
    setProgress({ done: 0, total });
    setStatus("analyzing");

    const evals: PositionEvaluation[] = [];
    try {
      for (let i = 0; i < positions.length; i++) {
        if (cancelledRef.current) {
          runningRef.current = false;
          return;
        }
        const result = await evaluatePosition(positions[i].fen);
        evals.push(result);
        setProgress({ done: i + 1, total });
      }
    } catch (analysisError) {
      if (!cancelledRef.current) {
        setError(
          analysisError instanceof Error
            ? analysisError.message
            : "Stockfish analysis failed.",
        );
        setStatus("error");
      }
      runningRef.current = false;
      return;
    }

    if (cancelledRef.current) {
      runningRef.current = false;
      return;
    }

    const evalsWhitePerspective: number[] = evals.map((evaluation, idx) => {
      const cp = toCentipawns(evaluation);
      return positions[idx].sideToMove === "w" ? cp : -cp;
    });

    const moves: MoveAnalysis[] = history.map((move, idx) => {
      const evalBefore = evalsWhitePerspective[idx];
      const evalAfter = evalsWhitePerspective[idx + 1];
      const player = move.color;
      const evalBeforePlayer = player === "w" ? evalBefore : -evalBefore;
      const evalAfterPlayer = player === "w" ? evalAfter : -evalAfter;
      const cpLoss = Math.max(0, evalBeforePlayer - evalAfterPlayer);

      const playedUci = uciFromMove(move);
      const bestUci = evals[idx].bestMoveUci;
      let bestSan: string | null = null;
      if (bestUci) {
        try {
          const tempChess = new Chess(positions[idx].fen);
          const m = tempChess.move({
            from: bestUci.slice(0, 2),
            to: bestUci.slice(2, 4),
            promotion: bestUci.length > 4 ? bestUci[4] : undefined,
          });
          if (m) bestSan = m.san;
        } catch {
          bestSan = null;
        }
      }

      const playedMatchesBest = bestUci !== null && bestUci === playedUci;

      const classification = classifyMove({
        cpLoss,
        evalBeforePlayer,
        evalAfterPlayer,
        playedMatchesBest,
      });

      const isMate = evals[idx + 1].mateIn !== null;
      const mateInSigned = evals[idx + 1].mateIn !== null
        ? (positions[idx + 1].sideToMove === "w" ? 1 : -1) * (evals[idx + 1].mateIn ?? 0)
        : null;

      return {
        ply: idx + 1,
        moveNumber: Math.floor(idx / 2) + 1,
        color: move.color,
        san: move.san,
        playedUci,
        fenBefore: move.before,
        fenAfter: move.after,
        bestMoveSan: bestSan,
        bestMoveUci: bestUci,
        evalBefore,
        evalAfter,
        cpLoss,
        classification,
        isMate,
        mateIn: mateInSigned,
      };
    });

    const { whiteAccuracy, blackAccuracy } = computeAccuracy(moves, evalsWhitePerspective);
    const counts = countClassifications(moves);

    setAnalysis({
      moves,
      evals: evalsWhitePerspective,
      whiteAccuracy,
      blackAccuracy,
      ...counts,
    });
    setStatus("complete");
    runningRef.current = false;
  }, [pgn, isReady, evaluatePosition]);

  return { runAnalysis, status, progress, analysis, error, isReady };
}
