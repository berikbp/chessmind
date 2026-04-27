import type { ReactNode } from "react";
import { Lock } from "lucide-react";

interface ModeCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
  active?: boolean;
  locked?: boolean;
  onClick?: () => void;
}

export function ModeCard({
  icon,
  title,
  description,
  badge,
  active,
  locked,
  onClick,
}: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={locked || undefined}
      aria-pressed={!locked ? active : undefined}
      className={`group min-h-32 w-full rounded-[1.75rem] border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chess-gold)]/70 ${
        locked
          ? "cursor-pointer border-[var(--chess-gold)]/20 bg-[var(--chess-gold)]/[0.055] opacity-80 hover:border-[var(--chess-gold)]/45 hover:bg-[var(--chess-gold)]/[0.08]"
          : active
            ? "border-[var(--chess-green)]/70 bg-[var(--chess-green)]/12 ring-1 ring-[var(--chess-green)]/25"
            : "border-[var(--chess-border)] bg-white/[0.045] hover:border-[var(--chess-gold)]/35 hover:bg-white/[0.075]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex-shrink-0 ${
              active ? "text-[var(--chess-green)]" : "text-[var(--chess-cream-muted)] group-hover:text-[var(--chess-cream)]"
            }`}
          >
            {icon}
          </span>
          <div>
            <p
              className={`font-semibold leading-tight ${
                active ? "text-[var(--chess-green)]" : "text-[var(--chess-cream)]"
              }`}
            >
              {title}
            </p>
            <p className="mt-1 text-sm leading-5 text-[var(--chess-cream-muted)]">{description}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                badge === "PRO"
                  ? "border border-[var(--chess-gold)]/35 bg-[var(--chess-gold)]/12 text-[var(--chess-gold)]"
                  : "border border-[var(--chess-border)] bg-black/15 text-[var(--chess-cream-muted)]"
              }`}
            >
              {badge}
            </span>
          )}
          {locked && <Lock className="h-3.5 w-3.5 text-[var(--chess-cream-muted)]" aria-hidden="true" />}
        </div>
      </div>
    </button>
  );
}
