import type { ReactNode } from "react";

interface PlayerInfoProps {
  username: string;
  rating: number;
  isCurrentTurn: boolean;
  timer?: ReactNode;
}

export function PlayerInfo({ username, rating, isCurrentTurn, timer }: PlayerInfoProps) {
  return (
    <div
      className={`flex h-12 items-center justify-between gap-2 rounded-2xl border px-2.5 py-1.5 transition ${
        isCurrentTurn
          ? "border-[var(--chess-green)]/55 bg-[var(--chess-green)]/12"
          : "border-[var(--chess-border)] bg-black/18"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--chess-panel-strong)] text-[11px] font-black text-[var(--chess-gold)]">
          {username[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight text-[var(--chess-cream)]">
            {username}
          </span>
          <span className="text-[11px] font-semibold leading-tight text-[var(--chess-cream-muted)]">
            {rating}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {timer}
        <span
          className={`h-2.5 w-2.5 rounded-full bg-[var(--chess-green)] transition-opacity ${
            isCurrentTurn ? "animate-pulse opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}
