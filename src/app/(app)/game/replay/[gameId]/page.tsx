import { notFound } from "next/navigation";

import { SavedGameReplayClient } from "@/components/board/SavedGameReplayClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GameRecord } from "@/types";

interface Props {
  params: Promise<{ gameId: string }>;
}

export default async function GameReplayPage({ params }: Props) {
  const { gameId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: rawGame } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  const game = rawGame as GameRecord | null;
  if (!game || !game.pgn) notFound();

  if (game.white_id !== user.id && game.black_id !== user.id) notFound();

  const playerColor = game.white_id === user.id ? "w" : "b";

  return (
    <main className="mx-auto max-w-6xl px-0 py-2 sm:px-4 sm:py-6">
      <SavedGameReplayClient game={{ ...game, pgn: game.pgn }} playerColor={playerColor} />
    </main>
  );
}
