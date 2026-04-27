"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Medal, Search, Trophy } from "lucide-react";

import { KAZAKHSTAN_CITIES } from "@/lib/kz-cities";
import type { LeaderboardEntry, Profile } from "@/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentProfile: Profile | null;
}

type LeaderboardTab = "global" | "city";

const PAGE_SIZE = 20;

function formatPercent(value: number | null) {
  if (value == null) return "0%";
  return `${Math.round(value)}%`;
}

function getDisplayRank(entry: LeaderboardEntry, index: number) {
  return entry.global_rank ?? index + 1;
}

function isCurrentUser(entry: LeaderboardEntry, currentProfile: Profile | null) {
  if (!currentProfile) return false;

  return (
    entry.username === currentProfile.username &&
    entry.city === currentProfile.city &&
    entry.rating === currentProfile.rating
  );
}

export function LeaderboardTable({ entries, currentProfile }: LeaderboardTableProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("global");
  const [selectedCity, setSelectedCity] = useState(currentProfile?.city ?? "All");
  const [page, setPage] = useState(1);

  const cityOptions = useMemo(() => {
    const knownCities = new Set<string>();
    for (const entry of entries) {
      if (entry.city) knownCities.add(entry.city);
    }

    return [
      "All",
      ...KAZAKHSTAN_CITIES.filter((city) => knownCities.has(city)),
      ...Array.from(knownCities)
        .filter((city) => !KAZAKHSTAN_CITIES.includes(city as (typeof KAZAKHSTAN_CITIES)[number]))
        .sort((a, b) => a.localeCompare(b)),
    ];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const ranked = [...entries].sort((a, b) => {
      const ratingDelta = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDelta !== 0) return ratingDelta;
      return (a.global_rank ?? Number.MAX_SAFE_INTEGER) - (b.global_rank ?? Number.MAX_SAFE_INTEGER);
    });

    if (activeTab !== "city" || selectedCity === "All") return ranked;

    return ranked.filter((entry) => entry.city === selectedCity);
  }, [activeTab, entries, selectedCity]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const currentUserIndex = filteredEntries.findIndex((entry) => isCurrentUser(entry, currentProfile));
  const localRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;

  function changeTab(tab: LeaderboardTab) {
    setActiveTab(tab);
    setPage(1);
  }

  function changeCity(city: string) {
    setSelectedCity(city);
    setPage(1);
  }

  return (
    <section className="card-surface overflow-hidden rounded-[2.25rem]">
      <div className="flex flex-col gap-4 border-b border-[var(--chess-border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--chess-green)]">
            Leaderboard
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-[var(--chess-cream)]">
            Top players
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="inline-flex rounded-2xl border border-[var(--chess-border)] bg-black/18 p-1">
            <button
              type="button"
              onClick={() => changeTab("global")}
              className={`focus-ring rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeTab === "global"
                  ? "bg-[var(--chess-green)] text-[#141009]"
                  : "text-[var(--chess-cream-muted)] hover:bg-white/[0.07]"
              }`}
            >
              Global
            </button>
            <button
              type="button"
              onClick={() => changeTab("city")}
              className={`focus-ring rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeTab === "city"
                  ? "bg-[var(--chess-green)] text-[#141009]"
                  : "text-[var(--chess-cream-muted)] hover:bg-white/[0.07]"
              }`}
            >
              By City
            </button>
          </div>

          {activeTab === "city" ? (
            <label className="flex items-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-black/18 px-3 py-2 text-sm text-[var(--chess-cream-muted)]">
              <MapPin className="h-4 w-4 text-[var(--chess-gold)]" aria-hidden="true" />
              <span className="sr-only">City</span>
              <select
                value={selectedCity}
                onChange={(event) => changeCity(event.target.value)}
                className="focus-ring bg-transparent text-sm font-bold text-[var(--chess-cream)]"
              >
                {cityOptions.map((city) => (
                  <option key={city} value={city} className="bg-[#211a12] text-[var(--chess-cream)]">
                    {city}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--chess-border)] p-5 sm:grid-cols-3 sm:p-6">
        <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
          <Trophy className="h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
          <p className="mt-3 text-2xl font-black text-[var(--chess-cream)]">{entries.length}</p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
            Ranked players
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
          <Medal className="h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
          <p className="mt-3 text-2xl font-black text-[var(--chess-cream)]">
            {currentProfile?.rating ?? "—"}
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
            Your rating
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
          <Search className="h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
          <p className="mt-3 text-2xl font-black text-[var(--chess-cream)]">
            {localRank ? `#${localRank}` : "—"}
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
            {activeTab === "city" ? "City rank" : "Visible rank"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--chess-border)] text-left text-[11px] font-black uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
              <th className="px-5 py-4">Rank</th>
              <th className="px-5 py-4">Player</th>
              <th className="px-5 py-4">City</th>
              <th className="px-5 py-4 text-right">Rating</th>
              <th className="px-5 py-4 text-right">Games</th>
              <th className="px-5 py-4 text-right">W / L / D</th>
              <th className="px-5 py-4 text-right">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-[var(--chess-cream-muted)]">
                  No ranked players found for this filter.
                </td>
              </tr>
            ) : (
              pageEntries.map((entry, index) => {
                const globalIndex = (safePage - 1) * PAGE_SIZE + index;
                const isSelf = isCurrentUser(entry, currentProfile);
                const rank = activeTab === "city" && selectedCity !== "All"
                  ? globalIndex + 1
                  : getDisplayRank(entry, globalIndex);

                return (
                  <tr
                    key={`${entry.username ?? "unknown"}-${entry.city ?? "none"}-${globalIndex}`}
                    className={`border-b border-[var(--chess-border)] text-sm transition last:border-b-0 ${
                      isSelf
                        ? "bg-[var(--chess-green)]/14 text-[var(--chess-cream)]"
                        : "text-[var(--chess-cream-muted)] hover:bg-white/[0.045]"
                    }`}
                  >
                    <td className="px-5 py-4 font-black text-[var(--chess-gold)]">#{rank}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--chess-panel-strong)] text-xs font-black text-[var(--chess-gold)]">
                          {(entry.username ?? "?").slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-black text-[var(--chess-cream)]">
                            {entry.username ?? "Unknown"}
                            {isSelf ? " · You" : ""}
                          </p>
                          <p className="text-xs font-semibold text-[var(--chess-cream-muted)]">
                            {entry.total_games ?? 0} rated games
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold">{entry.city ?? "Unknown"}</td>
                    <td className="px-5 py-4 text-right font-black text-[var(--chess-cream)]">
                      {entry.rating ?? 0}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">{entry.total_games ?? 0}</td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {entry.wins ?? 0} / {entry.losses ?? 0} / {entry.draws ?? 0}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {formatPercent(entry.win_rate)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--chess-border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-sm font-semibold text-[var(--chess-cream-muted)]">
          Showing page {safePage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="focus-ring flex items-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-4 py-2 text-sm font-bold text-[var(--chess-cream)] transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={safePage === totalPages}
            className="focus-ring flex items-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-4 py-2 text-sm font-bold text-[var(--chess-cream)] transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
