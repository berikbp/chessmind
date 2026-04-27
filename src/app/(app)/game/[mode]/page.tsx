import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ChessGame } from "@/components/board/ChessGame";
import type { Profile } from "@/types";
import type { Color } from "chess.js";

interface PageProps {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ difficulty?: string; color?: string; time?: string }>;
}

type Difficulty = "easy" | "medium" | "hard";
type GameMode = "ai" | "friend";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function parseDifficulty(value: string | undefined): Difficulty {
  return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : "medium";
}

function parsePlayerColor(value: string | undefined): Color {
  return value === "b" || value === "black" ? "b" : "w";
}

function parseGameMode(mode: string): GameMode {
  if (mode === "friend" || mode === "vs-friend") return "friend";
  if (mode === "ai" || mode === "vs-ai") return "ai";
  redirect("/lobby");
}

export default async function GamePage({ params, searchParams }: PageProps) {
  const [{ mode }, sp] = await Promise.all([params, searchParams]);

  const difficulty = parseDifficulty(sp.difficulty);
  const playerColor = parsePlayerColor(sp.color);
  const gameMode = parseGameMode(mode);
  const timeControl = sp.time ?? "untimed";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profileQuery = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = profileQuery.data as Profile | null;

  return (
    <main className="flex min-h-[calc(100svh-112px)] justify-center overflow-visible py-0 lg:h-[calc(100svh-132px)] lg:min-h-[560px] lg:overflow-hidden">
      <ChessGame
        playerColor={playerColor}
        playerName={profile?.username ?? "You"}
        playerRating={profile?.rating ?? 1200}
        gameMode={gameMode}
        difficulty={difficulty}
        timeControl={timeControl}
      />
    </main>
  );
}
