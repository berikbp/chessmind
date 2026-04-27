import { BarChart3, Medal, Shield, Trophy } from "lucide-react";

import type { Profile } from "@/types";

interface StatsGridProps {
  profile: Profile;
  totalGames: number;
  winRate: number;
}

export function StatsGrid({ profile, totalGames, winRate }: StatsGridProps) {
  const stats = [
    { label: "Rating", value: profile.rating, icon: Medal, tone: "text-[var(--chess-gold)]" },
    { label: "Wins", value: profile.wins, icon: Trophy, tone: "text-[#a8cf6a]" },
    { label: "Losses", value: profile.losses, icon: Shield, tone: "text-[#eaa29b]" },
    { label: "Win Rate", value: `${winRate}%`, icon: BarChart3, tone: "text-[var(--chess-cream)]" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <article key={stat.label} className="card-surface rounded-[1.75rem] p-5">
            <Icon className={`h-5 w-5 ${stat.tone}`} aria-hidden="true" />
            <p className={`mt-4 text-3xl font-black ${stat.tone}`}>{stat.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
              {stat.label}
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--chess-cream-muted)]">
              {totalGames} total games
            </p>
          </article>
        );
      })}
    </section>
  );
}
