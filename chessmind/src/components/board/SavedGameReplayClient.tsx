"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chess } from "chess.js";
import type { Color, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Swords,
} from "lucide-react";

import type { GameRecord } from "@/types";

type GameWithPgn = GameRecord & { pgn: string };

interface SavedGameReplayClientProps {
  game: GameWithPgn;
  playerColor: Color;
}

interface ReplayMove {
  after: string;
  before: string;
  color: Color;
  from: string;
  moveNumber: number;
  ply: number;
  san: string;
  to: string;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BOARD_SIZE_STYLE = {
  "--replay-board-size": "min(540px, calc(100vw - 48px), calc(100svh - 240px))",
} as CSSProperties;

function buildReplay(pgn: string) {
  const game = new Chess();
  try {
    game.loadPgn(pgn);
  } catch {
    return { moves: [] as ReplayMove[], startingFen: STARTING_FEN };
  }

  const history = game.history({ verbose: true }) as Move[];
  return {
    moves: history.map((move, index) => ({
      after: move.after,
      before: move.before,
      color: move.color,
      from: move.from,
      moveNumber: Math.floor(index / 2) + 1,
      ply: index + 1,
      san: move.san,
      to: move.to,
    })),
    startingFen: history[0]?.before ?? STARTING_FEN,
  };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function getResultLabel(game: GameRecord, playerColor: Color) {
  const playerWon =
    (game.result === "1-0" && playerColor === "w") ||
    (game.result === "0-1" && playerColor === "b");
  if (game.result === "1/2-1/2") return { label: "Draw", tone: "text-[var(--chess-cream-muted)]" };
  return playerWon
    ? { label: "Win", tone: "text-[#a8cf6a]" }
    : { label: "Loss", tone: "text-[#eaa29b]" };
}

export function SavedGameReplayClient({ game, playerColor }: SavedGameReplayClientProps) {
  const router = useRouter();
  const { moves, startingFen } = useMemo(() => buildReplay(game.pgn), [game.pgn]);
  const [currentPly, setCurrentPly] = useState(0);
  const totalPlies = moves.length;
  const currentMove = currentPly > 0 ? moves[currentPly - 1] : null;
  const currentFen = currentMove?.after ?? startingFen;
  const result = getResultLabel(game, playerColor);
  const orientation = playerColor === "b" ? "black" : "white";
  const reviewHref = `/game/review/${game.id}`;

  const goFirst = useCallback(() => setCurrentPly(0), []);
  const goPrev = useCallback(() => setCurrentPly((ply) => Math.max(0, ply - 1)), []);
  const goNext = useCallback(
    () => setCurrentPly((ply) => Math.min(totalPlies, ply + 1)),
    [totalPlies],
  );
  const goLast = useCallback(() => setCurrentPly(totalPlies), [totalPlies]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentPly((ply) => Math.max(0, ply - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentPly((ply) => Math.min(totalPlies, ply + 1));
      }
      if (event.key === "Home") {
        event.preventDefault();
        setCurrentPly(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setCurrentPly(totalPlies);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPlies]);

  const arrows = useMemo(() => {
    if (!currentMove) return [];
    return [
      {
        color: "rgba(201, 168, 76, 0.78)",
        endSquare: currentMove.to,
        startSquare: currentMove.from,
      },
    ];
  }, [currentMove]);

  return (
    <main className="mx-auto grid w-full max-w-6xl items-start gap-5 lg:grid-cols-[auto_minmax(340px,420px)] lg:justify-center">
      <section
        className="card-surface mx-auto w-full max-w-[568px] rounded-[1.75rem] p-3 lg:mx-0"
        style={{ ...BOARD_SIZE_STYLE, width: "calc(var(--replay-board-size) + 28px)" }}
      >
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--chess-border)] bg-black/16 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring rounded-xl border border-[var(--chess-border)] bg-white/[0.055] p-2 transition hover:bg-white/[0.09]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-[var(--chess-cream)]" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--chess-gold)]">
              Saved game · {formatDate(game.played_at)}
            </p>
            <h1 className="mt-1 truncate font-display text-xl font-bold text-[var(--chess-cream)]">
              Replay board
            </h1>
          </div>
          <span className={`rounded-full border border-[var(--chess-border)] bg-black/18 px-3 py-1 text-xs font-black ${result.tone}`}>
            {result.label}
          </span>
        </div>

        <div
          className="relative overflow-hidden rounded-[1.25rem] border border-[var(--chess-border)] shadow-[0_22px_60px_rgba(0,0,0,0.38)]"
          style={{ width: "var(--replay-board-size)", height: "var(--replay-board-size)" }}
        >
          <Chessboard
            options={{
              allowDrawingArrows: false,
              animationDurationInMs: 140,
              arrows,
              boardOrientation: orientation,
              boardStyle: { borderRadius: "20px" },
              darkSquareStyle: { backgroundColor: "#7a4f28" },
              lightSquareStyle: { backgroundColor: "#ead7b4" },
              position: currentFen,
            }}
          />
        </div>
      </section>

      <aside className="card-surface flex max-h-[calc(100svh-112px)] min-h-[560px] flex-col overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-[var(--chess-border)] p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--chess-green)]">
            Game replay
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-[var(--chess-cream)]">
            Move through the game.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--chess-cream-muted)]">
            Review the saved position first. Start Stockfish analysis only when you want engine
            labels, eval graph, and coach explanations.
          </p>
        </div>

        <div className="border-b border-[var(--chess-border)] p-4">
          <div className="rounded-[1.35rem] border border-[var(--chess-border)] bg-black/18 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--chess-cream-muted)]">
              Current position
            </p>
            <p className="mt-2 font-display text-xl font-bold text-[var(--chess-cream)]">
              {currentMove
                ? `${currentMove.moveNumber}${currentMove.color === "w" ? "." : "..."} ${currentMove.san}`
                : "Starting position"}
            </p>
            <p className="mt-1 text-xs font-bold tabular-nums text-[var(--chess-cream-muted)]">
              {currentPly} / {totalPlies}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <NavButton onClick={goFirst} disabled={currentPly === 0} aria-label="First move">
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
              </NavButton>
              <NavButton onClick={goPrev} disabled={currentPly === 0} aria-label="Previous move">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </NavButton>
              <NavButton onClick={goNext} disabled={currentPly >= totalPlies} aria-label="Next move">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </NavButton>
              <NavButton onClick={goLast} disabled={currentPly >= totalPlies} aria-label="Last move">
                <ChevronsRight className="h-4 w-4" aria-hidden="true" />
              </NavButton>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--chess-cream-muted)]">
              Arrow keys work
            </span>
          </div>
        </div>

        <div className="grid gap-2 border-b border-[var(--chess-border)] p-4 sm:grid-cols-2">
          <Link
            href={reviewHref}
            className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-gold)] px-4 py-3 text-sm font-black text-[#141009] transition hover:brightness-110"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Stockfish analysis
          </Link>
          <Link
            href={reviewHref}
            className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--chess-green)]/35 bg-[var(--chess-green)]/12 px-4 py-3 text-sm font-black text-[var(--chess-green)] transition hover:bg-[var(--chess-green)]/18"
          >
            <Brain className="h-4 w-4" aria-hidden="true" />
            AI coach
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--chess-gold)]">
              Moves
            </p>
            <Swords className="h-4 w-4 text-[var(--chess-gold)]" aria-hidden="true" />
          </div>
          <ReplayMoveList moves={moves} currentPly={currentPly} onSelectPly={setCurrentPly} />
        </div>
      </aside>
    </main>
  );
}

function ReplayMoveList({
  currentPly,
  moves,
  onSelectPly,
}: {
  currentPly: number;
  moves: ReplayMove[];
  onSelectPly: (ply: number) => void;
}) {
  const pairs: Array<{ moveNumber: number; white: ReplayMove | null; black: ReplayMove | null }> = [];

  for (const move of moves) {
    if (move.color === "w") {
      pairs.push({ black: null, moveNumber: move.moveNumber, white: move });
    } else {
      const last = pairs[pairs.length - 1];
      if (last && last.moveNumber === move.moveNumber) {
        last.black = move;
      } else {
        pairs.push({ black: move, moveNumber: move.moveNumber, white: null });
      }
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      <div className="grid gap-1">
        {pairs.map((pair) => (
          <div
            key={pair.moveNumber}
            className="grid grid-cols-[2.25rem_1fr_1fr] items-center gap-1 text-sm"
          >
            <span className="text-right text-xs font-bold text-[var(--chess-cream-muted)]">
              {pair.moveNumber}.
            </span>
            {pair.white ? (
              <ReplayMoveButton
                isActive={pair.white.ply === currentPly}
                move={pair.white}
                onSelectPly={onSelectPly}
              />
            ) : (
              <span />
            )}
            {pair.black ? (
              <ReplayMoveButton
                isActive={pair.black.ply === currentPly}
                move={pair.black}
                onSelectPly={onSelectPly}
              />
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReplayMoveButton({
  isActive,
  move,
  onSelectPly,
}: {
  isActive: boolean;
  move: ReplayMove;
  onSelectPly: (ply: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectPly(move.ply)}
      className={`focus-ring rounded-md px-2 py-1 text-left font-semibold transition ${
        isActive
          ? "bg-[var(--chess-green)]/22 text-[var(--chess-cream)]"
          : "text-[var(--chess-cream)] hover:bg-white/[0.08]"
      }`}
    >
      {move.san}
    </button>
  );
}

function NavButton({
  children,
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--chess-border)] bg-white/[0.04] text-[var(--chess-cream)] transition hover:bg-white/[0.09] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}
