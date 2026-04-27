interface TimerProps {
  seconds: number;
  isActive: boolean;
  isTimed: boolean;
  label: string;
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function Timer({ seconds, isActive, isTimed, label }: TimerProps) {
  const isCritical = isTimed && seconds <= 30;
  const displayValue = isTimed ? formatClock(seconds) : "∞";

  return (
    <div
      aria-label={`${label} clock ${isTimed ? formatClock(seconds) : "untimed"}`}
      className={`w-[76px] shrink-0 rounded-lg border px-2 py-1 text-right transition sm:w-[88px] lg:w-24 ${
        isCritical
          ? "border-red-400/50 bg-red-500/16 text-red-100"
          : isActive
            ? "border-[var(--chess-green)]/60 bg-[var(--chess-green)]/14 text-[var(--chess-cream)]"
            : "border-[var(--chess-border)] bg-black/16 text-[var(--chess-cream-muted)]"
      }`}
    >
      <p
        className={`font-mono text-[22px] font-black leading-none tabular-nums sm:text-2xl lg:text-[28px] ${
          isCritical && isActive ? "animate-pulse" : ""
        }`}
      >
        {displayValue}
      </p>
      <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
    </div>
  );
}
