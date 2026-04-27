"use client";

import { useState } from "react";
import { Check, MapPin } from "lucide-react";

import { RecentGamesTable } from "@/components/profile/RecentGamesTable";
import { StatsGrid } from "@/components/profile/StatsGrid";
import { KAZAKHSTAN_CITIES } from "@/lib/kz-cities";
import type { GameRecord, Profile } from "@/types";

interface ProfileClientProps {
  profile: Profile;
  recentGames: GameRecord[];
  userId: string;
}

function calculateWinRate(profile: Profile) {
  const totalGames = profile.wins + profile.losses + profile.draws;
  if (totalGames === 0) return 0;
  return Math.round((profile.wins / totalGames) * 100);
}

export function ProfileClient({ profile, recentGames, userId }: ProfileClientProps) {
  const [city, setCity] = useState(profile.city);
  const [savedCity, setSavedCity] = useState(profile.city);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalGames = profile.wins + profile.losses + profile.draws;
  const winRate = calculateWinRate(profile);
  const initials = profile.username.slice(0, 2).toUpperCase();
  const canSaveCity = city.trim().length > 0 && city.trim() !== savedCity;

  async function saveCity() {
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      const data = (await response.json()) as { error?: string; profile?: Profile };

      if (!response.ok) {
        setMessage(data.error ?? "Failed to update city.");
        return;
      }

      setSavedCity(data.profile?.city ?? city);
      setCity(data.profile?.city ?? city);
      setMessage("City updated.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="space-y-8">
      <section className="wood-surface rounded-[2.25rem] border border-[var(--chess-border)] p-7 shadow-[var(--chess-shadow)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-[var(--chess-green)] text-2xl font-black text-[#141009] shadow-[0_16px_36px_rgba(121,168,59,0.22)]">
              {initials}
            </div>
            <div>
              <span className="inline-flex rounded-full border border-[var(--chess-gold)]/30 bg-black/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--chess-gold)]">
                Player profile
              </span>
              <h1 className="mt-4 font-display text-5xl font-bold leading-[0.95] tracking-tight text-[var(--chess-cream)] sm:text-6xl">
                {profile.username}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--chess-cream-muted)]">
                Track your stats, recent games, and city ranking identity from one place.
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--chess-border)] bg-black/18 p-4">
            <label
              htmlFor="profile-city"
              className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--chess-green)]"
            >
              City
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--chess-gold)]" />
                <input
                  id="profile-city"
                  list="profile-cities"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="focus-ring w-full rounded-2xl border border-[var(--chess-border)] bg-black/20 py-3 pl-10 pr-4 text-sm font-bold text-[var(--chess-cream)]"
                />
                <datalist id="profile-cities">
                  {KAZAKHSTAN_CITIES.map((cityOption) => (
                    <option key={cityOption} value={cityOption} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={() => void saveCity()}
                disabled={isSaving || !canSaveCity}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-4 py-3 text-sm font-black text-[#141009] transition hover:bg-[#8fbd4a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Save
                  </>
                )}
              </button>
            </div>
            {message ? (
              <p className="mt-2 text-sm font-semibold text-[var(--chess-cream-muted)]" aria-live="polite">
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <StatsGrid profile={profile} totalGames={totalGames} winRate={winRate} />

      <section>
        <RecentGamesTable games={recentGames} userId={userId} />
      </section>
    </main>
  );
}
