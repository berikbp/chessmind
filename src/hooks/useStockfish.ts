"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SKILL_LEVELS = {
  medium: { skillLevel: 3, movetime: 500 },
  hard: { skillLevel: 8, movetime: 1500 },
} as const;

export type StockfishDifficulty = keyof typeof SKILL_LEVELS;

interface UseStockfishOptions {
  difficulty: StockfishDifficulty;
  enabled?: boolean;
}

export function useStockfish({ difficulty, enabled = true }: UseStockfishOptions) {
  const workerRef = useRef<Worker | null>(null);
  const pendingResolveRef = useRef<((move: string | null) => void) | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const { skillLevel, movetime } = SKILL_LEVELS[difficulty];

  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker("/stockfish-18-lite-single.js");
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;
      if (line === "uciok") {
        worker.postMessage("isready");
      } else if (line === "readyok") {
        worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
        setIsReady(true);
      } else if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const uciMove = parts[1] !== "(none)" ? parts[1] : null;
        setIsThinking(false);
        pendingResolveRef.current?.(uciMove ?? null);
        pendingResolveRef.current = null;
      }
    };

    worker.onerror = () => {
      setIsThinking(false);
      pendingResolveRef.current?.(null);
      pendingResolveRef.current = null;
    };

    worker.postMessage("uci");

    return () => {
      pendingResolveRef.current?.(null);
      pendingResolveRef.current = null;
      worker.postMessage("quit");
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, [enabled, skillLevel]);

  const getBestMove = useCallback(
    (fen: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const worker = workerRef.current;
        if (!worker || !isReady) {
          resolve(null);
          return;
        }
        if (pendingResolveRef.current) {
          worker.postMessage("stop");
          pendingResolveRef.current(null);
        }
        pendingResolveRef.current = resolve;
        setIsThinking(true);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go movetime ${movetime}`);
      });
    },
    [isReady, movetime],
  );

  return { getBestMove, isThinking, isReady };
}
