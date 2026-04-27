"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Handshake, Skull, Trophy } from "lucide-react";
import type { Color } from "chess.js";
import type { GameResult } from "@/hooks/useChessGame";

interface GameOverOverlayProps {
  result: GameResult;
  termination: string;
  playerColor: Color;
  onPlayAgain: () => void;
  ratingChange?: number | null;
  reviewGameId?: string | null;
  saving?: boolean;
}

export function GameOverOverlay({ result, termination, playerColor, onPlayAgain, ratingChange, reviewGameId, saving }: GameOverOverlayProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const playerWon =
    (result === "1-0" && playerColor === "w") ||
    (result === "0-1" && playerColor === "b");
  const isDraw = result === "1/2-1/2";

  useEffect(() => {
    if (!playerWon) return;
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ["#c9a84c", "#ffd700", "#ffffff"] });
    confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
    confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
  }, [playerWon]);

  const title = playerWon ? "You Win!" : isDraw ? "Draw" : "You Lose";
  const titleColor = playerWon
    ? "text-[var(--chess-gold)]"
    : isDraw
      ? "text-[var(--chess-cream)]"
      : "text-[var(--chess-cream-muted)]";
  const ResultIcon = playerWon ? Trophy : isDraw ? Handshake : Skull;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[1.25rem]">
      {/* Backdrop — darker on loss to signal defeat */}
      <div
        className={`absolute inset-0 rounded-lg backdrop-blur-sm ${
          playerWon ? "bg-black/65" : isDraw ? "bg-black/70" : "bg-black/82"
        }`}
      />

      {/* Card */}
      <div className="card-surface relative z-10 flex w-72 flex-col items-center gap-5 rounded-[1.75rem] px-6 py-7">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/20 text-[var(--chess-gold)]">
          <ResultIcon className="h-8 w-8" aria-hidden="true" />
        </span>

        <div className="text-center">
          <p className={`font-display text-3xl font-bold ${titleColor}`}>{title}</p>
          <p className="mt-1 text-sm font-semibold capitalize text-[var(--chess-cream-muted)]">
            {termination}
          </p>
          {ratingChange != null && (
            <p
              className={`mt-1.5 text-sm font-semibold ${
                ratingChange >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {ratingChange >= 0 ? "+" : ""}
              {ratingChange} rating
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2">
          <button
            onClick={onPlayAgain}
            className="focus-ring w-full rounded-2xl bg-[var(--chess-green)] px-4 py-3 text-sm font-black text-[#141009] transition hover:bg-[#8fbd4a] active:scale-95"
          >
            Play Again
          </button>
          <button
            onClick={() => { setNavigating(true); router.push("/lobby"); }}
            disabled={navigating}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-4 py-3 text-sm font-bold text-[var(--chess-cream)] transition hover:bg-white/[0.09] active:scale-95 disabled:opacity-60"
          >
            {navigating && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            )}
            {navigating ? "Loading…" : "Back to Lobby"}
          </button>
          <button
            onClick={() => {
              if (!reviewGameId) return;
              setNavigating(true);
              router.push(`/game/review/${reviewGameId}`);
            }}
            disabled={!reviewGameId || navigating || saving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--chess-gold)]/35 bg-[var(--chess-gold)]/10 px-4 py-3 text-sm font-bold text-[var(--chess-gold)] transition hover:bg-[var(--chess-gold)]/18 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Saving game…
              </>
            ) : reviewGameId ? (
              "Review with Stockfish →"
            ) : (
              "Review unavailable"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
