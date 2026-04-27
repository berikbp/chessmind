"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  AlertTriangle,
  Brain,
  CalendarClock,
  ChevronLeft,
  CheckCircle2,
  Crown,
  Lightbulb,
  LockKeyhole,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Chess } from "chess.js";
import type { Move, PieceSymbol, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";

import { PromotionDialog } from "@/components/board/PromotionDialog";
import { ProModal } from "@/components/ui/ProModal";
import { buildSquareStyles } from "@/lib/chess/board-styles";
import { PUZZLES, getPuzzleByIndex } from "@/lib/chess/puzzles";

type PuzzleStatus = "idle" | "active" | "success";

interface UsagePayload {
  code?: string;
  error?: string;
  isPro?: boolean;
  limit?: number | null;
  puzzle?: {
    limit: number | null;
    remaining: number | null;
    used: number;
  };
  usesRemaining?: number | null;
  usesToday?: number;
}

const DAILY_USAGE_SETUP_MESSAGE =
  "Daily limits are not installed yet. Run supabase/step20_daily_usage.sql in Supabase SQL Editor.";

const BOARD_SIZE_STYLE = {
  "--puzzle-board-size": "min(520px, calc(100vw - 48px), calc(100svh - 260px))",
} as CSSProperties;

function moveToUci(move: Move) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

function applyUciMove(game: Chess, uci: string) {
  return game.move({
    from: uci.slice(0, 2) as Square,
    promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    to: uci.slice(2, 4) as Square,
  });
}

function isPromotionAttempt(game: Chess, from: Square, to: Square) {
  return (game.moves({ square: from, verbose: true }) as Move[]).some(
    (move) => move.to === to && Boolean(move.promotion),
  );
}

function getLimitLabel({
  isPro,
  limit,
  remaining,
}: {
  isPro: boolean;
  limit: number | null;
  remaining: number | null;
}) {
  if (!isPro && remaining === null) return "Checking...";
  if (isPro || limit === null || remaining === null) return "Pro unlimited";
  return `${remaining} / ${limit} free today`;
}

export function PuzzleClient() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = getPuzzleByIndex(puzzleIndex);
  const [fen, setFen] = useState(puzzle.fen);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>("idle");
  const [feedback, setFeedback] = useState("Start the puzzle when you are ready.");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [usageRemaining, setUsageRemaining] = useState<number | null>(null);
  const [usageLimit, setUsageLimit] = useState<number | null>(3);
  const [isPro, setIsPro] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(true);

  const game = useMemo(() => new Chess(fen), [fen]);
  const canMove =
    status === "active" &&
    stepIndex < puzzle.solution.length &&
    game.turn() === puzzle.sideToMove;
  const isLastPuzzle = puzzleIndex >= PUZZLES.length - 1;
  const orientation = puzzle.sideToMove === "w" ? "white" : "black";
  const solvedCount = status === "success" ? puzzleIndex + 1 : puzzleIndex;
  const progress = Math.round((solvedCount / PUZZLES.length) * 100);
  const limitLabel = getLimitLabel({ isPro, limit: usageLimit, remaining: usageRemaining });
  const squareStyles = useMemo(
    () =>
      buildSquareStyles({
        fen,
        isCheck: game.inCheck(),
        lastMove,
        legalMoves,
        selectedSquare,
        turn: game.turn(),
      }),
    [fen, game, lastMove, legalMoves, selectedSquare],
  );

  const resetPuzzleState = useCallback((nextIndex: number, nextStatus: PuzzleStatus) => {
    const nextPuzzle = getPuzzleByIndex(nextIndex);
    setPuzzleIndex(nextIndex);
    setFen(nextPuzzle.fen);
    setStepIndex(0);
    setStatus(nextStatus);
    setFeedback(nextStatus === "active" ? "Find the forcing move." : "Start the puzzle when you are ready.");
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setPendingPromotion(null);
    setIsEndModalOpen(false);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadUsage() {
      try {
        const response = await fetch("/api/usage", { cache: "no-store" });
        const data = (await response.json()) as UsagePayload;
        if (isCancelled) return;
        if (data.code === "DAILY_USAGE_NOT_CONFIGURED") {
          setUsageError(data.error ?? DAILY_USAGE_SETUP_MESSAGE);
          return;
        }
        if (!response.ok || !data.puzzle) return;
        setIsPro(Boolean(data.isPro));
        setUsageLimit(data.puzzle.limit);
        setUsageRemaining(data.puzzle.remaining);
      } catch {
        // Puzzle start still checks limits server-side.
      }
    }

    void loadUsage();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "active" || stepIndex >= puzzle.solution.length) return;

    const current = new Chess(fen);
    if (current.turn() === puzzle.sideToMove) return;

    const expectedReply = puzzle.solution[stepIndex];
    const timer = window.setTimeout(() => {
      const replyGame = new Chess(fen);
      const reply = applyUciMove(replyGame, expectedReply);
      if (!reply) return;

      setFen(replyGame.fen());
      setLastMove({ from: reply.from, to: reply.to });
      setStepIndex((currentStep) => currentStep + 1);
      setFeedback(`${reply.san}. Your move.`);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [fen, puzzle, status, stepIndex]);

  async function startPuzzle(nextIndex = puzzleIndex) {
    if (isStarting) return false;

    setIsStarting(true);
    setUsageError(null);
    setFeedback("Checking your daily puzzle limit...");

    try {
      const response = await fetch("/api/usage/puzzle", { method: "POST" });
      const data = (await response.json()) as UsagePayload;

      if (response.status === 503 && data.code === "DAILY_USAGE_NOT_CONFIGURED") {
        setUsageError(data.error ?? DAILY_USAGE_SETUP_MESSAGE);
        setFeedback("Puzzle limits need database setup before the start button can work.");
        return false;
      }

      if (response.status === 429 || data.code === "PUZZLE_LIMIT_REACHED") {
        setIsPro(Boolean(data.isPro));
        setUsageLimit(data.limit ?? usageLimit);
        setUsageRemaining(data.usesRemaining ?? 0);
        setUsageError(data.error ?? "Daily puzzle limit reached.");
        setFeedback("Daily puzzle limit reached. Pro unlocks unlimited puzzles.");
        setIsIntroModalOpen(false);
        setIsProModalOpen(true);
        return false;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Could not start puzzle.");
      }

      setIsPro(Boolean(data.isPro));
      setUsageLimit(data.limit ?? null);
      setUsageRemaining(data.usesRemaining ?? null);
      resetPuzzleState(nextIndex, "active");
      setIsIntroModalOpen(false);
      return true;
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : "Could not start puzzle.");
      setFeedback("Could not start puzzle. Check the message below.");
      return false;
    } finally {
      setIsStarting(false);
    }
  }

  function restartCurrentPuzzle() {
    resetPuzzleState(puzzleIndex, status === "idle" ? "idle" : "active");
  }

  const selectSquare = useCallback((square: Square) => {
    const selectedGame = new Chess(fen);
    const moves = selectedGame.moves({ square, verbose: true }) as Move[];
    setPendingPromotion(null);
    setSelectedSquare(square);
    setLegalMoves(moves);
  }, [fen]);

  const attemptMove = useCallback(
    (sourceSquare: Square, targetSquare: Square, promotion?: PieceSymbol) => {
      if (!canMove) return false;

      const expected = puzzle.solution[stepIndex];
      const attemptGame = new Chess(fen);
      const sourceMoves = attemptGame.moves({ square: sourceSquare, verbose: true }) as Move[];
      const needsPromotion = sourceMoves.some((move) => move.to === targetSquare && Boolean(move.promotion));

      if (needsPromotion && !promotion) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        setSelectedSquare(null);
        setLegalMoves([]);
        setFeedback("Choose the promotion piece.");
        return false;
      }

      const candidate = (attemptGame.moves({ square: sourceSquare, verbose: true }) as Move[]).find(
        (move) => move.to === targetSquare && (!move.promotion || move.promotion === promotion),
      );

      if (!candidate) return false;

      if (moveToUci(candidate) !== expected) {
        setFeedback("Not that move. Look for the forcing idea.");
        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingPromotion(null);
        return false;
      }

      const move = applyUciMove(attemptGame, expected);
      if (!move) return false;

      const nextStep = stepIndex + 1;
      setFen(attemptGame.fen());
      setLastMove({ from: move.from, to: move.to });
      setSelectedSquare(null);
      setLegalMoves([]);
      setPendingPromotion(null);
      setStepIndex(nextStep);

      if (nextStep >= puzzle.solution.length) {
        setStatus("success");
        if (isLastPuzzle) {
          setFeedback("Set complete. More puzzles are coming soon.");
          setIsEndModalOpen(true);
        } else {
          setFeedback("Solved. Pattern remembered.");
        }
      } else {
        setFeedback("Correct.");
      }

      return true;
    },
    [canMove, fen, isLastPuzzle, puzzle.solution, stepIndex],
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (!canMove) return;

      const clickedSquare = square as Square;
      const clickedPiece = game.get(clickedSquare);

      if (selectedSquare) {
        const isLegalTarget = legalMoves.some((move) => move.to === clickedSquare);
        if (isLegalTarget) {
          if (isPromotionAttempt(game, selectedSquare, clickedSquare)) {
            setPendingPromotion({ from: selectedSquare, to: clickedSquare });
            setSelectedSquare(null);
            setLegalMoves([]);
            setFeedback("Choose the promotion piece.");
            return;
          }

          attemptMove(selectedSquare, clickedSquare);
          return;
        }

        if (clickedPiece?.color === game.turn()) {
          selectSquare(clickedSquare);
          return;
        }

        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingPromotion(null);
        return;
      }

      if (clickedPiece?.color === game.turn()) {
        selectSquare(clickedSquare);
      }
    },
    [attemptMove, canMove, game, legalMoves, selectSquare, selectedSquare],
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare) return false;
      const from = sourceSquare as Square;
      const to = targetSquare as Square;

      if (isPromotionAttempt(game, from, to)) {
        setPendingPromotion({ from, to });
        setSelectedSquare(null);
        setLegalMoves([]);
        setFeedback("Choose the promotion piece.");
        return false;
      }

      return attemptMove(from, to);
    },
    [attemptMove, game],
  );

  const handlePromotionSelect = useCallback(
    (piece: PieceSymbol) => {
      if (!pendingPromotion) return;
      attemptMove(pendingPromotion.from, pendingPromotion.to, piece);
    },
    [attemptMove, pendingPromotion],
  );

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
    setFeedback("Promotion cancelled. Find the forcing move.");
  }, []);

  function handleStartClick() {
    void startPuzzle();
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[auto_minmax(320px,420px)] lg:items-start">
      <section
        className="card-surface mx-auto w-full max-w-[552px] rounded-[1.75rem] p-3"
        style={{ ...BOARD_SIZE_STYLE, width: "calc(var(--puzzle-board-size) + 24px)" }}
      >
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--chess-border)] bg-black/16 px-4 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--chess-gold)]">
              Puzzle {puzzleIndex + 1} / {PUZZLES.length}
            </p>
            <h1 className="mt-1 font-display text-xl font-bold text-[var(--chess-cream)]">
              {puzzle.title}
            </h1>
          </div>
          <span className="rounded-full border border-[var(--chess-green)]/30 bg-[var(--chess-green)]/10 px-3 py-1 text-xs font-black text-[var(--chess-green)]">
            {puzzle.sideToMove === "w" ? "White" : "Black"} to move
          </span>
        </div>

        <div
          className="relative overflow-hidden rounded-[1.25rem] border border-[var(--chess-border)] shadow-[0_22px_60px_rgba(0,0,0,0.38)]"
          style={{ width: "var(--puzzle-board-size)", height: "var(--puzzle-board-size)" }}
        >
          <Chessboard
            options={{
              allowDrawingArrows: false,
              animationDurationInMs: 140,
              boardOrientation: orientation,
              boardStyle: { borderRadius: "20px" },
              darkSquareStyle: { backgroundColor: "#7a4f28" },
              lightSquareStyle: { backgroundColor: "#ead7b4" },
              onPieceDrop: handlePieceDrop,
              onSquareClick: handleSquareClick,
              position: fen,
              squareStyles,
            }}
          />
          {pendingPromotion ? (
            <PromotionDialog
              color={puzzle.sideToMove}
              onCancel={handlePromotionCancel}
              onSelect={handlePromotionSelect}
            />
          ) : null}
          {status === "idle" ? (
            <div className="absolute inset-0 z-[5] flex items-center justify-center bg-[#141009]/72 px-5 text-center backdrop-blur-[3px]">
              <div className="max-w-sm rounded-[1.5rem] border border-[var(--chess-border)] bg-[#211a11]/92 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.5)]">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--chess-gold)]/16 text-[var(--chess-gold)]">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-2xl font-bold text-[var(--chess-cream)]">
                  Puzzle not started yet
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">
                  Press start first. The board unlocks only after the daily limit check passes.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleStartClick}
                    disabled={isStarting}
                    className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-4 py-2 text-xs font-black text-[#141009] transition hover:bg-[#8fbd4a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {isStarting ? "Checking..." : "Start"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsIntroModalOpen(true)}
                    className="focus-ring min-h-11 rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-4 py-2 text-xs font-black text-[var(--chess-cream)] transition hover:bg-white/[0.09]"
                  >
                    Rules
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="card-surface rounded-[1.75rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--chess-green)]">
              Daily tactics
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-[var(--chess-cream)]">
              Solve, then continue.
            </h2>
          </div>
          <Target className="h-6 w-6 text-[var(--chess-gold)]" aria-hidden="true" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="Theme" value={puzzle.theme} />
          <InfoTile label="Goal" value={puzzle.goal} />
          <InfoTile label="Limit" value={limitLabel} />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-[var(--chess-green)] transition-all"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>

        <div
          className={`mt-5 rounded-[1.5rem] border p-4 ${
            status === "success"
              ? "border-[var(--chess-green)]/35 bg-[var(--chess-green)]/10"
              : feedback.startsWith("Not")
                ? "border-rose-400/30 bg-rose-400/10"
                : "border-[var(--chess-border)] bg-black/16"
          }`}
        >
          <div className="flex items-start gap-3">
            {status === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--chess-green)]" aria-hidden="true" />
            ) : feedback.startsWith("Not") ? (
              <XCircle className="mt-0.5 h-5 w-5 text-rose-300" aria-hidden="true" />
            ) : (
              <Lightbulb className="mt-0.5 h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
            )}
            <p className="text-sm font-semibold leading-6 text-[var(--chess-cream)]">{feedback}</p>
          </div>
        </div>

        {usageError ? (
          <p className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">
            {usageError}
          </p>
        ) : null}

        <div className="mt-5 grid gap-2">
          {status === "idle" ? (
            <button
              type="button"
              onClick={handleStartClick}
              disabled={isStarting}
              className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-4 py-3 text-sm font-black text-[#141009] transition hover:bg-[#8fbd4a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Brain className="h-4 w-4" aria-hidden="true" />
              {isStarting ? "Starting..." : "Start puzzle"}
            </button>
          ) : null}

          {status === "active" ? (
            <button
              type="button"
              onClick={restartCurrentPuzzle}
              className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.04] px-4 py-3 text-sm font-bold text-[var(--chess-cream)] transition hover:bg-white/[0.08]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset puzzle
            </button>
          ) : null}

          {status === "success" ? (
            <button
              type="button"
              onClick={() => {
                if (isLastPuzzle) {
                  setIsEndModalOpen(true);
                  return;
                }
                void startPuzzle(puzzleIndex + 1);
              }}
              disabled={isStarting}
              className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-gold)] px-4 py-3 text-sm font-black text-[#141009] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLastPuzzle ? (
                <Trophy className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
              {isStarting ? "Checking..." : isLastPuzzle ? "Set complete" : "Next puzzle"}
            </button>
          ) : null}
        </div>

        <p className="mt-4 text-xs leading-5 text-[var(--chess-cream-muted)]">
          MVP set: 10 varied puzzles. Free accounts can start 3 per day; Pro accounts are unlimited.
        </p>
      </aside>

      <ProModal
        featureName="daily puzzles"
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />
      <PuzzleIntroModal
        isOpen={isIntroModalOpen}
        isPro={isPro}
        isStarting={isStarting}
        limitLabel={limitLabel}
        onStart={handleStartClick}
        usageError={usageError}
      />
      <PuzzleEndModal isOpen={isEndModalOpen} onClose={() => setIsEndModalOpen(false)} />
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--chess-border)] bg-black/16 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[var(--chess-cream)]">{value}</p>
    </div>
  );
}

function PuzzleIntroModal({
  isOpen,
  isPro,
  isStarting,
  limitLabel,
  onStart,
  usageError,
}: {
  isOpen: boolean;
  isPro: boolean;
  isStarting: boolean;
  limitLabel: string;
  onStart: () => void;
  usageError: string | null;
}) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/72 backdrop-blur-md" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="puzzle-intro-title"
        aria-describedby="puzzle-intro-description"
        className="wood-surface relative z-10 max-h-[calc(100svh-32px)] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[var(--chess-border)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.58)] sm:p-7"
      >
        <div className="absolute right-[-5rem] top-[-5rem] h-52 w-52 rounded-full bg-[var(--chess-gold)]/14 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-5rem] h-52 w-52 rounded-full bg-[var(--chess-green)]/12 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--chess-gold)]/35 bg-[var(--chess-gold)]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--chess-gold)]">
            <Brain className="h-3.5 w-3.5" aria-hidden="true" />
            Daily tactics
          </span>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <h2
                id="puzzle-intro-title"
                className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-[var(--chess-cream)] sm:text-5xl"
              >
                Start the puzzle only when you are ready.
              </h2>
              <p id="puzzle-intro-description" className="mt-4 text-base leading-8 text-[var(--chess-cream-muted)]">
                The board is visible for preview, but it is locked until you press start. Starting
                consumes one daily puzzle attempt for free accounts.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
              <div className="flex items-start gap-3">
                {isPro ? (
                  <Crown className="mt-0.5 h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--chess-green)]" aria-hidden="true" />
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--chess-cream-muted)]">
                    Access
                  </p>
                  <p className="mt-1 text-xl font-black text-[var(--chess-cream)]">{limitLabel}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--chess-cream-muted)]">
                Free accounts get 3 puzzle starts per day. Pro accounts can continue without the daily cap.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <IntroRule
              icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
              title="Locked first"
              text="If pieces do not move, the puzzle has not started yet."
            />
            <IntroRule
              icon={<Target className="h-5 w-5" aria-hidden="true" />}
              title="One best move"
              text="Play the forcing move shown by the tactic, not any legal move."
            />
            <IntroRule
              icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
              title="Promotion"
              text="When a pawn reaches the last rank, choose the promoted piece in the popup."
            />
          </div>

          {usageError ? (
            <p className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">
              {usageError}
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={onStart}
              disabled={isStarting}
              className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-5 py-3 text-sm font-black text-[#141009] transition hover:bg-[#8fbd4a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {isStarting ? "Checking daily limit..." : "Start puzzle"}
            </button>
            <Link
              href="/lobby"
              className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-5 py-3 text-sm font-black text-[var(--chess-cream)] transition hover:bg-white/[0.09]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Go to lobby
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function IntroRule({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--chess-gold)]/12 text-[var(--chess-gold)]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--chess-cream)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">{text}</p>
    </div>
  );
}

function PuzzleEndModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close puzzle completion window"
        className="absolute inset-0 cursor-default bg-black/72 backdrop-blur-md"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="puzzle-end-title"
        aria-describedby="puzzle-end-description"
        className="wood-surface relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] border border-[var(--chess-border)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.58)] sm:p-8"
      >
        <div className="absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full bg-[var(--chess-gold)]/16 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-5rem] h-48 w-48 rounded-full bg-[var(--chess-green)]/14 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="focus-ring absolute right-4 top-4 z-20 rounded-2xl border border-[var(--chess-border)] bg-black/25 p-2.5 text-[var(--chess-cream-muted)] transition hover:bg-white/[0.08] hover:text-[var(--chess-cream)]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--chess-green)]/35 bg-[var(--chess-green)]/12 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--chess-green)]">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            Puzzle set complete
          </span>

          <h2
            id="puzzle-end-title"
            className="mt-5 font-display text-4xl font-bold leading-[0.95] tracking-tight text-[var(--chess-cream)] sm:text-5xl"
          >
            More puzzles are coming soon.
          </h2>

          <p id="puzzle-end-description" className="mt-4 text-base leading-8 text-[var(--chess-cream-muted)]">
            You finished the current MVP tactics set. The next update should add a larger pool
            with cleaner themes, ratings, and no repeated puzzle patterns.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
              <Sparkles className="h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
              <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--chess-cream)]">
                Next batch
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">
                More varied tactics, fewer repeats, better puzzle quality.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
              <CalendarClock className="h-5 w-5 text-[var(--chess-green)]" aria-hidden="true" />
              <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--chess-cream)]">
                Daily mode
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">
                Daily limits stay ready for a bigger tactics library.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="focus-ring mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--chess-gold)] px-4 py-3 text-sm font-black text-[#141009] transition hover:brightness-110 active:scale-[0.98]"
          >
            Stay on puzzles
          </button>
        </div>
      </section>
    </div>
  );
}
