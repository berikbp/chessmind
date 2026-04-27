"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Target,
} from "lucide-react";

import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import { ProModal } from "@/components/ui/ProModal";
import type {
  CoachExplanation,
  CoachMomentInput,
  GameRecord,
  MoveAnalysis,
  MoveClassification,
} from "@/types";

import { AnnotatedMoveList } from "./AnnotatedMoveList";
import { EvalGraph } from "./EvalGraph";
import { GameReviewBoard } from "./GameReviewBoard";
import { ReviewCoachPanel } from "./ReviewCoachPanel";

type GameWithPgn = GameRecord & { pgn: string };

interface GameReviewClientProps {
  game: GameWithPgn;
  playerColor: "w" | "b";
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const CLASSIFICATION_LABEL: Record<MoveClassification, { text: string; tone: string }> = {
  best: { text: "Best move", tone: "text-emerald-400" },
  good: { text: "Good move", tone: "text-sky-400" },
  inaccuracy: { text: "Inaccuracy", tone: "text-yellow-400" },
  mistake: { text: "Mistake", tone: "text-orange-400" },
  blunder: { text: "Blunder", tone: "text-rose-400" },
  missed_win: { text: "Missed win", tone: "text-purple-400" },
};

type CoachStatus = "idle" | "loading" | "ready" | "error" | "limited";

const MAX_COACH_MOMENTS = 10;

interface CoachResponse {
  code?: string;
  error?: string;
  explanations?: CoachExplanation[];
  limit?: number | null;
  resetsAt?: string;
  usesRemaining?: number | null;
  usesToday?: number;
}

interface UsageResponse {
  coachReview?: {
    limit: number | null;
    remaining: number | null;
    resetsAt: string;
    used: number;
  };
  error?: string;
  isPro?: boolean;
}

function toCoachMoment(move: MoveAnalysis): CoachMomentInput {
  return {
    bestMoveSan: move.bestMoveSan,
    bestMoveUci: move.bestMoveUci,
    classification: move.classification,
    color: move.color,
    cpLoss: move.cpLoss,
    evalAfter: move.evalAfter,
    evalBefore: move.evalBefore,
    fen: move.fenBefore,
    fenAfter: move.fenAfter,
    moveNumber: move.moveNumber,
    ply: move.ply,
    san: move.san,
  };
}

function selectCoachMoments(moves: MoveAnalysis[], playerColor: "w" | "b"): CoachMomentInput[] {
  const selected = new Map<number, MoveAnalysis>();
  const playerMoves = moves.filter((move) => move.color === playerColor);
  const forceInclude: MoveClassification[] = ["missed_win", "blunder", "mistake"];
  const isMoverImprovement = (move: MoveAnalysis) =>
    move.color === "w" ? move.evalAfter - move.evalBefore : move.evalBefore - move.evalAfter;

  for (const classification of forceInclude) {
    for (const move of playerMoves.filter((candidate) => candidate.classification === classification)) {
      selected.set(move.ply, move);
    }
  }

  for (const move of [...playerMoves]
    .filter((candidate) => candidate.classification === "inaccuracy" && candidate.cpLoss >= 35)
    .sort((a, b) => b.cpLoss - a.cpLoss)) {
    selected.set(move.ply, move);
    if (selected.size >= MAX_COACH_MOMENTS) break;
  }

  for (const move of [...playerMoves]
    .filter(
      (candidate) =>
        (candidate.classification === "best" || candidate.classification === "good") &&
        isMoverImprovement(candidate) >= 65,
    )
    .sort((a, b) => isMoverImprovement(b) - isMoverImprovement(a))) {
    selected.set(move.ply, move);
    if (selected.size >= MAX_COACH_MOMENTS) break;
  }

  return Array.from(selected.values())
    .sort((a, b) => a.ply - b.ply)
    .slice(0, MAX_COACH_MOMENTS)
    .map(toCoachMoment);
}

export function GameReviewClient({ game, playerColor }: GameReviewClientProps) {
  const router = useRouter();
  const orientation = playerColor === "w" ? "white" : "black";

  const { runAnalysis, status, progress, analysis, error, isReady } = useGameAnalysis({
    pgn: game.pgn,
    enabled: true,
    depth: 15,
  });

  const [currentPly, setCurrentPly] = useState(0);
  const [coachStatus, setCoachStatus] = useState<CoachStatus>("idle");
  const [coachExplanations, setCoachExplanations] = useState<CoachExplanation[]>([]);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachUsesRemaining, setCoachUsesRemaining] = useState<number | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadDailyUsage() {
      try {
        const response = await fetch("/api/usage", { cache: "no-store" });
        const data = (await response.json()) as UsageResponse;
        if (isCancelled || !response.ok || !data.coachReview) return;

        setCoachUsesRemaining(data.coachReview.remaining);
      } catch {
        // The coach endpoint still enforces limits server-side.
      }
    }

    void loadDailyUsage();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleRunAnalysis = useCallback(() => {
    setCurrentPly(0);
    setCoachStatus("idle");
    setCoachExplanations([]);
    setCoachError(null);
    void runAnalysis();
  }, [runAnalysis]);

  const totalPlies = analysis?.moves.length ?? 0;
  const currentMove: MoveAnalysis | null =
    analysis && currentPly > 0 ? analysis.moves[currentPly - 1] : null;
  const coachMoments = useMemo(
    () => (analysis ? selectCoachMoments(analysis.moves, playerColor) : []),
    [analysis, playerColor],
  );

  const playerBlunders = useMemo(() => {
    if (!analysis) return [];
    return analysis.moves
      .filter(
        (m) =>
          m.color === playerColor &&
          (m.classification === "blunder" || m.classification === "missed_win"),
      )
      .sort((a, b) => a.ply - b.ply);
  }, [analysis, playerColor]);

  const cycleToNextBlunder = useCallback(() => {
    if (playerBlunders.length === 0) return;
    const next = playerBlunders.find((b) => b.ply > currentPly) ?? playerBlunders[0];
    setCurrentPly(next.ply);
  }, [playerBlunders, currentPly]);

  const goFirst = useCallback(() => setCurrentPly(0), []);
  const goPrev = useCallback(
    () => setCurrentPly((p) => Math.max(0, p - 1)),
    [],
  );
  const goNext = useCallback(
    () => setCurrentPly((p) => Math.min(totalPlies, p + 1)),
    [totalPlies],
  );
  const goLast = useCallback(() => setCurrentPly(totalPlies), [totalPlies]);

  const playerWon =
    (game.result === "1-0" && playerColor === "w") ||
    (game.result === "0-1" && playerColor === "b");
  const isDraw = game.result === "1/2-1/2";
  const resultLabel = isDraw ? "Draw" : playerWon ? "Win" : "Loss";
  const resultColor = isDraw
    ? "text-[var(--chess-cream-muted)]"
    : playerWon
      ? "text-emerald-400"
      : "text-rose-400";

  const playerAccuracy = analysis
    ? playerColor === "w"
      ? analysis.whiteAccuracy
      : analysis.blackAccuracy
    : null;
  const opponentAccuracy = analysis
    ? playerColor === "w"
      ? analysis.blackAccuracy
      : analysis.whiteAccuracy
    : null;

  const playerStats = analysis
    ? {
        blunders:
          playerColor === "w" ? analysis.blunders.white : analysis.blunders.black,
        mistakes:
          playerColor === "w" ? analysis.mistakes.white : analysis.mistakes.black,
        inaccuracies:
          playerColor === "w"
            ? analysis.inaccuracies.white
            : analysis.inaccuracies.black,
      }
    : null;

  const progressPercent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const handleGenerateCoachExplanations = useCallback(async () => {
    if (!analysis || coachMoments.length === 0 || coachStatus === "loading") return;

    setCoachStatus("loading");
    setCoachError(null);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moments: coachMoments,
          pgn: game.pgn,
          playerColor,
        }),
      });
      const data = (await response.json()) as CoachResponse;

      if (response.status === 429 || data.code === "COACH_LIMIT_REACHED") {
        setCoachStatus("limited");
        setCoachError(data.error ?? "Coach explanation limit reached.");
        setCoachUsesRemaining(data.usesRemaining ?? 0);
        setIsProModalOpen(true);
        return;
      }

      if (!response.ok || !data.explanations) {
        throw new Error(data.error ?? "Could not generate coach explanations.");
      }

      setCoachExplanations([...data.explanations].sort((a, b) => a.ply - b.ply));
      setCoachUsesRemaining(data.usesRemaining ?? null);
      setCoachStatus("ready");
    } catch (coachError) {
      setCoachStatus("error");
      setCoachError(
        coachError instanceof Error
          ? coachError.message
          : "Could not generate coach explanations.",
      );
    }
  }, [analysis, coachMoments, coachStatus, game.pgn, playerColor]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="focus-ring rounded-xl border border-[var(--chess-border)] bg-white/[0.055] p-2 transition hover:bg-white/[0.09]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-[var(--chess-cream)]" aria-hidden="true" />
          </button>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--chess-green)]">
              Game review · {formatDate(game.played_at)}
            </p>
            <h1 className="font-display text-xl font-bold text-[var(--chess-cream)]">
              <span className={resultColor}>{resultLabel}</span>
              {game.termination ? (
                <span className="text-[var(--chess-cream-muted)]"> · {game.termination}</span>
              ) : null}
            </h1>
          </div>
        </div>

        {status === "complete" && analysis && (
          <div className="flex items-center gap-2">
            <AccuracyChip
              label="You"
              value={`${playerAccuracy?.toFixed(1) ?? "—"}%`}
              tone="text-[var(--chess-gold)]"
            />
            <AccuracyChip
              label="Opp"
              value={`${opponentAccuracy?.toFixed(1) ?? "—"}%`}
              tone="text-[var(--chess-cream)]"
            />
          </div>
        )}
      </header>

      {status === "idle" && (
        <div className="card-surface flex flex-col items-center gap-4 rounded-[2rem] p-8 text-center">
          <Brain className="h-10 w-10 text-[var(--chess-gold)]" aria-hidden="true" />
          <div>
            <p className="font-display text-xl font-bold text-[var(--chess-cream)]">
              Stockfish Game Review
            </p>
            <p className="mt-1 max-w-md text-sm text-[var(--chess-cream-muted)]">
              Stockfish 18 will evaluate every position in your game at depth 15 and
              flag your best moves, inaccuracies, mistakes, and blunders.
            </p>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={!isReady}
            className="focus-ring flex items-center gap-2 rounded-2xl bg-[var(--chess-gold)] px-6 py-3 text-sm font-black text-[#141009] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Brain className="h-4 w-4" aria-hidden="true" />
            {isReady ? "Start analysis" : "Loading engine…"}
          </button>
        </div>
      )}

      {(status === "preparing" || status === "analyzing") && (
        <div className="card-surface flex flex-col gap-3 rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--chess-cream)]">
              Analyzing position {progress.done} / {progress.total}
            </span>
            <span className="text-xs font-bold text-[var(--chess-cream-muted)]">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-[var(--chess-gold)] transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-[var(--chess-cream-muted)]">
            Stockfish 18 · depth 15 · runs in your browser
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">
          <span className="flex-1">{error}</span>
          <button
            onClick={handleRunAnalysis}
            className="shrink-0 font-black text-rose-200 underline"
          >
            Retry
          </button>
        </div>
      )}

      {status === "complete" && analysis && playerStats && (
        <div className="mx-auto grid w-full max-w-[1420px] gap-4 lg:grid-cols-[auto_minmax(360px,410px)] lg:justify-center xl:grid-cols-[auto_minmax(330px,380px)_minmax(390px,440px)]">
          <div className="flex justify-center lg:justify-end">
            <GameReviewBoard
              analysis={analysis}
              currentPly={currentPly}
              onChangePly={setCurrentPly}
              orientation={orientation}
              startingFen={analysis.moves[0]?.fenBefore ?? STARTING_FEN}
            />
          </div>

          <aside className="card-surface flex w-full flex-col overflow-hidden rounded-[1.75rem] lg:h-[calc(100svh-128px)] lg:min-h-[640px] lg:max-h-[820px]">
            <div className="border-b border-[var(--chess-border)]/60 px-4 py-3">
              <CurrentMovePanel move={currentMove} totalPlies={totalPlies} currentPly={currentPly} />
            </div>

            <div className="grid grid-cols-3 border-b border-[var(--chess-border)]/60">
              <SidebarStat label="Blunders" value={playerStats.blunders} tone="text-rose-400" />
              <SidebarStat
                label="Mistakes"
                value={playerStats.mistakes}
                tone="text-orange-400"
                divider
              />
              <SidebarStat
                label="Inaccuracies"
                value={playerStats.inaccuracies}
                tone="text-yellow-400"
                divider
              />
            </div>

            <div className="border-b border-[var(--chess-border)]/60 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--chess-cream-muted)]">
                  Evaluation
                </p>
                <p className="text-[10px] font-bold text-[var(--chess-cream-muted)]">
                  Click the graph to jump
                </p>
              </div>
              <EvalGraph
                analysis={analysis}
                currentPly={currentPly}
                onSelectPly={setCurrentPly}
                height={108}
              />
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-[var(--chess-border)]/60 px-4 py-2.5">
              <div className="flex items-center gap-1">
                <NavButton onClick={goFirst} disabled={currentPly === 0} aria-label="First move">
                  <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                </NavButton>
                <NavButton onClick={goPrev} disabled={currentPly === 0} aria-label="Previous move">
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </NavButton>
                <NavButton
                  onClick={goNext}
                  disabled={currentPly >= totalPlies}
                  aria-label="Next move"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </NavButton>
                <NavButton
                  onClick={goLast}
                  disabled={currentPly >= totalPlies}
                  aria-label="Last move"
                >
                  <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                </NavButton>
              </div>
              {playerBlunders.length > 0 && (
                <button
                  onClick={cycleToNextBlunder}
                  className="focus-ring flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-rose-300 transition hover:bg-rose-400/15 active:scale-95"
                >
                  <Target className="h-3.5 w-3.5" aria-hidden="true" />
                  Next blunder · {playerBlunders.length}
                </button>
              )}
            </div>

            <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden lg:min-h-0">
              <div className="flex items-center justify-between gap-3 px-4 pb-1.5 pt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--chess-gold)]">
                  Moves
                </p>
                <p className="text-[10px] font-bold tabular-nums text-[var(--chess-cream-muted)]">
                  {currentPly} / {totalPlies}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
                <AnnotatedMoveList
                  moves={analysis.moves}
                  currentPly={currentPly}
                  onSelectPly={setCurrentPly}
                />
              </div>
            </div>
          </aside>

          <ReviewCoachPanel
            className="lg:col-span-2 xl:col-span-1 xl:h-[calc(100svh-128px)] xl:min-h-[640px] xl:max-h-[820px]"
            error={coachError}
            explanations={coachExplanations}
            moments={coachMoments}
            onGenerate={handleGenerateCoachExplanations}
            onSelectPly={setCurrentPly}
            status={coachStatus}
            usesRemaining={coachUsesRemaining}
          />
        </div>
      )}
      <ProModal
        featureName="coach explanations"
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />
    </div>
  );
}

function CurrentMovePanel({
  move,
  totalPlies,
  currentPly,
}: {
  move: MoveAnalysis | null;
  totalPlies: number;
  currentPly: number;
}) {
  if (!move) {
    return (
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-[var(--chess-cream)]">
          Start
        </p>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--chess-cream-muted)]">
          0 / {totalPlies}
        </p>
      </div>
    );
  }
  const meta = CLASSIFICATION_LABEL[move.classification];
  const showAlternative =
    move.bestMoveSan &&
    move.bestMoveUci &&
    move.bestMoveUci !== move.playedUci &&
    (move.classification === "inaccuracy" ||
      move.classification === "mistake" ||
      move.classification === "blunder" ||
      move.classification === "missed_win");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--chess-cream-muted)]">
            {move.moveNumber}
            {move.color === "w" ? "." : "..."}
          </span>
          <span className="font-display text-base font-bold text-[var(--chess-cream)]">
            {move.san}
          </span>
          <span className={`text-[11px] font-black uppercase tracking-wide ${meta.tone}`}>
            {meta.text}
          </span>
        </div>
        <span className="text-[11px] font-bold tabular-nums text-[var(--chess-cream-muted)]">
          {currentPly} / {totalPlies}
        </span>
      </div>
      {showAlternative && (
        <p className="text-[11px] text-[var(--chess-cream-muted)]">
          Best was{" "}
          <span className="font-bold text-[var(--chess-gold)]">{move.bestMoveSan}</span>
        </p>
      )}
    </div>
  );
}

function SidebarStat({
  label,
  value,
  tone,
  divider = false,
}: {
  label: string;
  value: number;
  tone: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 text-center ${divider ? "border-l border-[var(--chess-border)]/60" : ""}`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
        {label}
      </p>
      <p className={`mt-0.5 font-display text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  children,
  ...rest
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--chess-border)] bg-white/[0.04] text-[var(--chess-cream)] transition hover:bg-white/[0.09] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}

function AccuracyChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-[var(--chess-border)] bg-black/20 px-2.5 py-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--chess-cream-muted)]">
        {label}
      </span>
      <span className={`font-display text-sm font-bold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
