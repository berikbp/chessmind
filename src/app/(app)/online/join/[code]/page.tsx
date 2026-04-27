import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Users } from "lucide-react";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OnlineGameRecord } from "@/types";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinOnlineGamePage({ params }: PageProps) {
  const [{ code }, supabase] = await Promise.all([
    params,
    createServerSupabaseClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  const { data: rawGame } = await admin
    .from("online_games")
    .select("*")
    .eq("invite_code", code.toUpperCase())
    .maybeSingle();

  if (!rawGame) {
    return <JoinProblem title="Invite not found" text="Check the link or ask your friend for a new invite." />;
  }

  const onlineGame = rawGame as OnlineGameRecord;

  if (onlineGame.white_id === user.id || onlineGame.black_id === user.id) {
    redirect(`/online/${onlineGame.id}`);
  }

  if (onlineGame.status !== "waiting") {
    return <JoinProblem title="Invite is closed" text="This game already started or finished." />;
  }

  if (onlineGame.white_id && onlineGame.black_id) {
    return <JoinProblem title="Game is full" text="This invite already has two players." />;
  }

  const joinUpdate = onlineGame.white_id
    ? {
        black_id: user.id,
        last_move_at: new Date().toISOString(),
        status: "active",
        version: onlineGame.version + 1,
      }
    : {
        last_move_at: new Date().toISOString(),
        status: "active",
        version: onlineGame.version + 1,
        white_id: user.id,
      };
  const { data: joinedGame, error } = await admin
    .from("online_games")
    .update(joinUpdate)
    .eq("id", onlineGame.id)
    .eq("status", "waiting")
    .select("id")
    .single();

  if (error || !joinedGame) {
    return <JoinProblem title="Could not join" text="The invite changed while you were joining. Try again." />;
  }

  redirect(`/online/${onlineGame.id}`);
}

function JoinProblem({ text, title }: { text: string; title: string }) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-112px)] w-full max-w-2xl items-center justify-center px-4">
      <section className="wood-surface w-full rounded-[2rem] border border-[var(--chess-border)] p-6 shadow-[var(--chess-shadow)] sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-rose-200">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Online invite
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold text-[var(--chess-cream)]">
          {title}
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--chess-cream-muted)]">{text}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/lobby"
            className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-5 py-3 text-sm font-black text-[#141009] transition hover:bg-[#8fbd4a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to lobby
          </Link>
          <Link
            href="/lobby"
            className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-5 py-3 text-sm font-black text-[var(--chess-cream)] transition hover:bg-white/[0.09]"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Create a new match
          </Link>
        </div>
      </section>
    </main>
  );
}
