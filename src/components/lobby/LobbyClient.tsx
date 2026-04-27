"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Users, Globe, Puzzle, Bot, ChevronRight, Trophy, Crosshair } from "lucide-react";

import { ModeCard } from "@/components/lobby/ModeCard";
import type { Profile } from "@/types";

interface LobbyClientProps {
  profile: Profile | null;
}

type GameMode = "ai" | "friend" | "online";
type Difficulty = "easy" | "medium" | "hard";
type ColorChoice = "w" | "b" | "random";
type TimeControl = "untimed" | "5+0" | "10+0" | "15+10";

const DIFFICULTY_META = {
  easy:   { label: "Easy",   rating: "~1000", desc: "Minimax · casual practice" },
  medium: { label: "Medium", rating: "~1400", desc: "Stockfish 3 · solid challenge" },
  hard:   { label: "Hard",   rating: "~1800", desc: "Stockfish 8 · serious test" },
} as const;

const TIME_CONTROLS = [
  { value: "untimed", label: "Untimed", desc: "Practice" },
  { value: "5+0", label: "5+0", desc: "Blitz" },
  { value: "10+0", label: "10+0", desc: "Rapid" },
  { value: "15+10", label: "15+10", desc: "Classical" },
] as const;

export function LobbyClient({ profile }: LobbyClientProps) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [colorChoice, setColorChoice] = useState<ColorChoice>("w");
  const [timeControl, setTimeControl] = useState<TimeControl>("10+0");
  const [navigating, setNavigating] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  function toggleMode(mode: GameMode) {
    setActiveMode((prev) => (prev === mode ? null : mode));
  }

  async function handlePlay() {
    if (!activeMode || navigating) return;
    setNavigating(true);
    setStartError(null);

    const finalColor = colorChoice === "random"
      ? Math.random() < 0.5 ? "w" : "b"
      : colorChoice;

    const params = new URLSearchParams({
      color: finalColor,
      time: timeControl,
    });

    if (activeMode === "ai") {
      params.set("difficulty", difficulty);
      router.push(`/game/vs-ai?${params.toString()}`);
      return;
    }

    if (activeMode === "friend") {
      router.push(`/game/vs-friend?${params.toString()}`);
      return;
    }

    try {
      const response = await fetch("/api/online-games", {
        body: JSON.stringify({
          hostColor: finalColor,
          timeControl,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; game?: { id: string } };

      if (!response.ok || !result.game?.id) {
        setStartError(result.error ?? "Could not create online game.");
        setNavigating(false);
        return;
      }

      router.push(`/online/${result.game.id}`);
    } catch {
      setStartError("Could not reach the online game server.");
      setNavigating(false);
    }
  }

  const stats = [
    { label: "Rating", value: profile?.rating ?? 1200, color: "text-[var(--chess-gold)]" },
    { label: "Wins", value: profile?.wins ?? 0, color: "text-[#a8cf6a]" },
    { label: "Losses", value: profile?.losses ?? 0, color: "text-[#eaa29b]" },
    { label: "Draws", value: profile?.draws ?? 0, color: "text-[var(--chess-cream-muted)]" },
  ];

  return (
    <main className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <div className="wood-surface rounded-[2.25rem] border border-[var(--chess-border)] p-7 shadow-[var(--chess-shadow)] sm:p-8">
          <span className="inline-flex rounded-full border border-[var(--chess-gold)]/30 bg-black/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--chess-gold)]">
            AI chess trainer
          </span>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-bold leading-[0.95] tracking-tight text-[var(--chess-cream)] sm:text-6xl">
            Choose the board. Start the lesson.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--chess-cream-muted)]">
            Play a fast training game, pass the board to a friend, or unlock deeper modes when the
            coach layer arrives. The game starts from one clear decision.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-[var(--chess-border)] bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--chess-cream-muted)]">
                Default
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--chess-cream)]">
                Medium AI · 10+0 · White
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--chess-border)] bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--chess-cream-muted)]">
                Focus
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--chess-cream)]">
                Play first, analyze later
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="card-surface grid grid-cols-2 gap-3 rounded-[2.25rem] p-5 sm:grid-cols-4 lg:grid-cols-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4"
            >
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
                {s.label}
              </p>
            </div>
          ))}
          <div className="col-span-2 rounded-[1.5rem] border border-[var(--chess-green)]/25 bg-[var(--chess-green)]/10 p-4 sm:col-span-4 lg:col-span-2">
            <div className="flex items-start gap-3">
              <Trophy className="mt-0.5 h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-[var(--chess-cream)]">
                  Welcome back{profile?.username ? `, ${profile.username}` : ""}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--chess-cream-muted)]">
                  Keep the next game short and intentional. One mistake reviewed well is better
                  than ten forgotten games.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface rounded-[2.25rem] p-5 sm:p-6">
        {/* Mode cards */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--chess-green)]">
              Play
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-[var(--chess-cream)]">
              Select a mode
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[var(--chess-cream-muted)]">
            Inspired by familiar consumer dashboards: fewer choices, larger targets, and one
            obvious next action.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">

          {/* vs AI */}
          <ModeCard
            icon={<Bot className="h-5 w-5" />}
            title="vs AI"
            description="Play against ChessMind's AI engine"
            badge="1000–1800"
            active={activeMode === "ai"}
            onClick={() => toggleMode("ai")}
          />

          {/* vs Friend */}
          <ModeCard
            icon={<Users className="h-5 w-5" />}
            title="vs Friend"
            description="Pass-and-play on the same device"
            active={activeMode === "friend"}
            onClick={() => toggleMode("friend")}
          />

          <ModeCard
            icon={<Globe className="h-5 w-5" />}
            title="Online Multiplayer"
            description="Create an invite link for a friend"
            badge="Invite"
            active={activeMode === "online"}
            onClick={() => toggleMode("online")}
          />

          {/* Puzzle — locked */}
          <ModeCard
            icon={<Puzzle className="h-5 w-5" />}
            title="Puzzle of the Day"
            description="Solve 3 free daily tactics"
            badge="3/day"
            onClick={() => router.push("/puzzles")}
          />
        </div>

        {/* Settings panel */}
        {activeMode && (
          <div className="mt-4 rounded-[1.75rem] border border-[var(--chess-green)]/25 bg-[var(--chess-green)]/[0.07] p-5">
            <div className="mb-5 flex items-start gap-3">
              <Crosshair className="mt-0.5 h-5 w-5 text-[var(--chess-green)]" aria-hidden="true" />
              <div>
                <p className="font-bold text-[var(--chess-cream)]">
                  {activeMode === "ai"
                    ? "Configure your AI game"
                    : activeMode === "online"
                      ? "Configure online invite"
                      : "Configure pass-and-play"}
                </p>
                <p className="mt-1 text-sm text-[var(--chess-cream-muted)]">
                  {activeMode === "online"
                    ? "You will get an invite link after the game is created."
                    : "These choices are saved into the game URL so later steps can read them."}
                </p>
              </div>
            </div>

            {/* Difficulty (AI only) */}
            {activeMode === "ai" && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--chess-cream-muted)]">
                  Difficulty
                </p>
                <div className="flex gap-2">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      aria-pressed={difficulty === d}
                      className={`focus-ring min-h-12 flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
                        difficulty === d
                          ? "bg-[var(--chess-green)] text-[#141009]"
                          : "border border-[var(--chess-border)] bg-black/18 text-[var(--chess-cream)] hover:bg-white/[0.07]"
                      }`}
                    >
                      <span className="block">{DIFFICULTY_META[d].label}</span>
                      <span className="block text-[10px] opacity-70">{DIFFICULTY_META[d].rating}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time control */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--chess-cream-muted)]">
                Time control
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc.value}
                    type="button"
                    onClick={() => setTimeControl(tc.value)}
                    aria-pressed={timeControl === tc.value}
                    className={`focus-ring min-h-12 rounded-xl px-3 py-2 text-sm font-bold transition ${
                      timeControl === tc.value
                        ? "bg-[var(--chess-green)] text-[#141009]"
                        : "border border-[var(--chess-border)] bg-black/18 text-[var(--chess-cream)] hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="block">{tc.label}</span>
                    <span className="block text-[10px] opacity-70">{tc.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--chess-cream-muted)]">
                Your color
              </p>
              <div className="flex gap-2">
                {([
                  { value: "w",      label: "White" },
                  { value: "b",      label: "Black" },
                  { value: "random", label: "Random" },
                ] as const).map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColorChoice(c.value)}
                    aria-pressed={colorChoice === c.value}
                    className={`focus-ring min-h-12 flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                      colorChoice === c.value
                        ? "bg-[var(--chess-green)] text-[#141009]"
                        : "border border-[var(--chess-border)] bg-black/18 text-[var(--chess-cream)] hover:bg-white/[0.07]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Play button */}
            {startError ? (
              <p className="mb-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">
                {startError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handlePlay()}
              disabled={navigating}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-4 py-4 text-sm font-black text-[#141009] shadow-[0_16px_36px_rgba(121,168,59,0.25)] transition hover:bg-[#8fbd4a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {navigating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#141009]/30 border-t-[#141009]" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {navigating
                ? activeMode === "online"
                  ? "Creating invite..."
                  : "Starting…"
                : activeMode === "online"
                  ? "Create Invite"
                  : "Start Game"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
