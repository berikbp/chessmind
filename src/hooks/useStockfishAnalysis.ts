"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PositionEvaluation {
  scoreCp: number | null;
  mateIn: number | null;
  bestMoveUci: string | null;
  depth: number;
}

interface UseStockfishAnalysisOptions {
  enabled?: boolean;
  depth?: number;
}

interface PendingEvaluation {
  reject: (error: Error) => void;
  resolve: (result: PositionEvaluation) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const POSITION_TIMEOUT_MS = 45_000;

function parseInfoLine(
  line: string,
): { scoreCp: number | null; mateIn: number | null; depth: number } | null {
  if (!line.startsWith("info ")) return null;
  const depthMatch = line.match(/\bdepth (\d+)\b/);
  if (!depthMatch) return null;
  const depth = parseInt(depthMatch[1], 10);

  const cpMatch = line.match(/\bscore cp (-?\d+)\b/);
  if (cpMatch) return { scoreCp: parseInt(cpMatch[1], 10), mateIn: null, depth };

  const mateMatch = line.match(/\bscore mate (-?\d+)\b/);
  if (mateMatch) return { scoreCp: null, mateIn: parseInt(mateMatch[1], 10), depth };

  return null;
}

export function useStockfishAnalysis({
  enabled = true,
  depth = 15,
}: UseStockfishAnalysisOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingEvaluation | null>(null);
  const lastInfoRef = useRef<{ scoreCp: number | null; mateIn: number | null; depth: number }>({
    scoreCp: null,
    mateIn: null,
    depth: 0,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker("/stockfish-18-lite-single.js");
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;
      if (line === "uciok") {
        worker.postMessage("isready");
        return;
      }
      if (line === "readyok") {
        worker.postMessage("setoption name Skill Level value 20");
        worker.postMessage("setoption name UCI_LimitStrength value false");
        setIsReady(true);
        return;
      }
      if (line.startsWith("info ")) {
        const info = parseInfoLine(line);
        if (info) lastInfoRef.current = info;
        return;
      }
      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const uciMove = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
        const result: PositionEvaluation = {
          scoreCp: lastInfoRef.current.scoreCp,
          mateIn: lastInfoRef.current.mateIn,
          depth: lastInfoRef.current.depth,
          bestMoveUci: uciMove,
        };
        const pending = pendingRef.current;
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        pending.resolve(result);
        pendingRef.current = null;
      }
    };

    worker.onerror = () => {
      const pending = pendingRef.current;
      if (pending) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error("Stockfish analysis engine failed to load or crashed."));
        pendingRef.current = null;
      }
      setIsReady(false);
    };

    worker.postMessage("uci");

    return () => {
      const pending = pendingRef.current;
      if (pending) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error("Stockfish analysis was cancelled."));
        pendingRef.current = null;
      }
      worker.postMessage("quit");
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, [enabled]);

  const evaluatePosition = useCallback(
    (fen: string): Promise<PositionEvaluation> => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker || !isReady) {
          reject(new Error("Stockfish analysis engine is not ready."));
          return;
        }
        const previous = pendingRef.current;
        if (previous) {
          worker.postMessage("stop");
          clearTimeout(previous.timeoutId);
          previous.reject(new Error("Previous Stockfish analysis request was cancelled."));
        }
        lastInfoRef.current = { scoreCp: null, mateIn: null, depth: 0 };
        const timeoutId = setTimeout(() => {
          if (!pendingRef.current) return;
          worker.postMessage("stop");
          pendingRef.current = null;
          reject(new Error("Stockfish analysis timed out on a position."));
        }, POSITION_TIMEOUT_MS);
        pendingRef.current = { reject, resolve, timeoutId };
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
      });
    },
    [isReady, depth],
  );

  return { evaluatePosition, isReady };
}
