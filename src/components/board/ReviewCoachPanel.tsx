"use client";

import { AlertTriangle, Brain, Lightbulb, Lock, RefreshCw, Route } from "lucide-react";

import type { CoachExplanation, CoachMomentInput, MoveClassification } from "@/types";

type CoachStatus = "idle" | "loading" | "ready" | "error" | "limited";

interface ReviewCoachPanelProps {
  className?: string;
  error: string | null;
  explanations: CoachExplanation[];
  moments: CoachMomentInput[];
  onGenerate: () => void;
  onSelectPly: (ply: number) => void;
  status: CoachStatus;
  usesRemaining: number | null;
}

const TONE_BY_CLASSIFICATION: Record<MoveClassification, string> = {
  best: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  good: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  inaccuracy: "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
  mistake: "border-orange-400/25 bg-orange-400/10 text-orange-300",
  blunder: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  missed_win: "border-purple-400/25 bg-purple-400/10 text-purple-300",
};

const LABEL_BY_CLASSIFICATION: Record<MoveClassification, string> = {
  best: "Best",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
  missed_win: "Missed win",
};

function compactText(value: string, maxLength = 96) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;

  const boundary = normalized.lastIndexOf(" ", maxLength - 1);
  return `${normalized.slice(0, boundary > 48 ? boundary : maxLength).trim()}...`;
}

export function ReviewCoachPanel({
  className,
  error,
  explanations,
  moments,
  onGenerate,
  onSelectPly,
  status,
  usesRemaining,
}: ReviewCoachPanelProps) {
  const hasExplanations = explanations.length > 0;
  const isLoading = status === "loading";
  const isLimited = status === "limited";
  const orderedExplanations = [...explanations].sort((a, b) => a.ply - b.ply);

  return (
    <section className={`card-surface flex min-h-[440px] w-full flex-col overflow-hidden rounded-[1.75rem] p-3 ${className ?? ""}`}>
      <div className="flex h-full min-h-0 flex-col rounded-[1.25rem] border border-[var(--chess-border)] bg-black/16 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chess-gold)]" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--chess-gold)]">
                Coach
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--chess-cream-muted)]">
                Key moments in game order.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full border border-[var(--chess-border)] px-2 py-1 text-[10px] font-bold text-[var(--chess-cream-muted)]">
              {moments.length} moments
            </span>
            {usesRemaining !== null ? (
              <span className="text-[10px] font-bold text-[var(--chess-cream-muted)]">
                {usesRemaining} left
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || moments.length === 0}
          className="focus-ring mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--chess-gold)] px-3 py-2 text-sm font-black text-[#141009] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : isLimited ? (
            <Lock className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
          )}
          {isLoading
            ? "Explaining..."
            : hasExplanations
              ? "Refresh"
              : "Explain"}
        </button>

        {moments.length === 0 ? (
          <p className="mt-2 text-xs font-semibold text-[var(--chess-cream-muted)]">
            No clear key moments found for your side.
          </p>
        ) : null}

        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs font-semibold leading-5 text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}

        {hasExplanations ? (
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {orderedExplanations.map((explanation) => {
              const isPositiveMoment =
                explanation.classification === "best" || explanation.classification === "good";
              return (
                <button
                  key={explanation.ply}
                  type="button"
                  onClick={() => onSelectPly(explanation.ply)}
                  className="focus-ring rounded-2xl border border-[var(--chess-border)] bg-white/[0.035] p-3 text-left transition hover:border-[var(--chess-gold)]/35 hover:bg-white/[0.06]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-[var(--chess-border)] bg-black/18 px-2 py-0.5 text-xs font-black text-[var(--chess-cream)]">
                      {explanation.moveNumber}
                      {explanation.color === "w" ? "." : "..."} {explanation.san}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${TONE_BY_CLASSIFICATION[explanation.classification]}`}>
                      {LABEL_BY_CLASSIFICATION[explanation.classification]}
                    </span>
                  </div>

                  <CoachLine label={isPositiveMoment ? "Why it matters" : "Why"} value={explanation.whyFailed} />
                  <CoachLine label={isPositiveMoment ? "Key idea" : "Missed"} value={explanation.whatMissed} />
                  <CoachLine label={isPositiveMoment ? "Next plan" : "Plan"} value={explanation.betterPlan} />
                  <div className="mt-2 inline-flex max-w-full items-start gap-2 rounded-lg border border-[var(--chess-green)]/20 bg-[var(--chess-green)]/8 px-2.5 py-1 text-[11px] leading-4 text-[var(--chess-cream-muted)]">
                    <Route className="mt-0.5 h-3 w-3 shrink-0 text-[var(--chess-green)]" aria-hidden="true" />
                    <span>
                      <span className="font-black text-[var(--chess-green)]">Pattern: </span>
                      {compactText(explanation.pattern, 56)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CoachLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1.5 text-xs leading-5 text-[var(--chess-cream-muted)]">
      <span className="font-black uppercase tracking-[0.12em] text-[var(--chess-cream)]">
        {label}:{" "}
      </span>
      {compactText(value)}
    </p>
  );
}
