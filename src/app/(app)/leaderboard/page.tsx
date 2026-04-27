import { redirect } from "next/navigation";

import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { LeaderboardEntry, Profile } from "@/types";

export default async function LeaderboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profileData }, { data: leaderboardData, error }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("leaderboard_view")
      .select("*")
      .order("rating", { ascending: false })
      .limit(500),
  ]);

  if (error) {
    throw new Error(`Failed to load leaderboard: ${error.message}`);
  }

  return (
    <main className="space-y-8">
      <section className="wood-surface rounded-[2.25rem] border border-[var(--chess-border)] p-7 shadow-[var(--chess-shadow)] sm:p-8">
        <span className="inline-flex rounded-full border border-[var(--chess-gold)]/30 bg-black/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--chess-gold)]">
          Rankings
        </span>
        <h1 className="mt-5 max-w-2xl font-display text-5xl font-bold leading-[0.95] tracking-tight text-[var(--chess-cream)] sm:text-6xl">
          Climb the ChessMind ladder.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--chess-cream-muted)]">
          Compare ratings globally or filter by city. The table updates from Supabase game results,
          so every saved rated game can move the standings.
        </p>
      </section>

      <LeaderboardTable
        entries={(leaderboardData ?? []) as LeaderboardEntry[]}
        currentProfile={profileData as Profile | null}
      />
    </main>
  );
}
