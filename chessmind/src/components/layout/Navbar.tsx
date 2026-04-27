import Link from "next/link";
import { BadgeCheck, ChevronRight, Crown, Sparkles } from "lucide-react";

import { LockedCoachNavItem } from "@/components/layout/LockedCoachNavItem";
import { SignOutButton } from "@/components/ui/SignOutButton";
import type { Profile } from "@/types";

interface NavbarProps {
  profile: Profile | null;
}

export function Navbar({ profile }: NavbarProps) {
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? "CM";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--chess-border)] bg-[#17130d]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/lobby"
          className="focus-ring group flex items-center gap-3 rounded-2xl"
          aria-label="ChessMind lobby"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--chess-green)] text-[#141009] shadow-[0_10px_28px_rgba(121,168,59,0.28)]">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:block">
            <span className="block font-display text-xl font-bold leading-none tracking-tight text-[var(--chess-cream)]">
              ChessMind
            </span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--chess-cream-muted)]">
              Play better
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-[var(--chess-border)] bg-white/[0.035] p-1 md:flex">
          <Link
            href="/lobby"
            className="focus-ring rounded-xl px-4 py-2 text-sm font-semibold text-[var(--chess-cream)] transition hover:bg-white/8"
          >
            Play
          </Link>
          <Link
            href="/leaderboard"
            className="focus-ring rounded-xl px-4 py-2 text-sm font-semibold text-[var(--chess-cream-muted)] transition hover:bg-white/8 hover:text-[var(--chess-cream)]"
          >
            Leaderboard
          </Link>
          <Link
            href="/profile"
            className="focus-ring rounded-xl px-4 py-2 text-sm font-semibold text-[var(--chess-cream-muted)] transition hover:bg-white/8 hover:text-[var(--chess-cream)]"
          >
            Profile
          </Link>
          <LockedCoachNavItem />
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.04] px-3 py-2 sm:flex">
            <BadgeCheck className="h-4 w-4 text-[var(--chess-gold)]" aria-hidden="true" />
            <span className="text-sm font-semibold text-[var(--chess-cream)]">
              {profile?.rating ?? 1200}
            </span>
          </div>

          <Link
            href="/profile"
            className="focus-ring flex items-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.04] py-1.5 pl-1.5 pr-2 transition hover:bg-white/[0.08] sm:pr-3"
            aria-label="Open profile"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--chess-panel-strong)] text-xs font-bold text-[var(--chess-gold)]">
              {initials}
            </span>
            <span className="hidden max-w-28 truncate text-sm font-semibold text-[var(--chess-cream)] lg:block">
              {profile?.username ?? "Player"}
            </span>
          </Link>

          <Link
            href="/game/vs-ai?difficulty=medium&color=w&time=10%2B0"
            className="focus-ring hidden items-center gap-1.5 rounded-2xl bg-[var(--chess-green)] px-4 py-2 text-sm font-bold text-[#141009] transition hover:bg-[#8fbd4a] xl:flex"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Quick Play
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
