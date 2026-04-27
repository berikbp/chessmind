import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateNewRating } from "@/lib/chess/utils";
import type { Profile } from "@/types";

const AI_RATINGS = { easy: 1000, medium: 1400, hard: 1800 } as const;

interface SaveGameBody {
  pgn: string;
  result: "1-0" | "0-1" | "1/2-1/2";
  termination: string;
  totalMoves: number;
  playerColor: "w" | "b";
  difficulty: "easy" | "medium" | "hard";
  gameMode: "ai" | "friend";
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as SaveGameBody;
  const { pgn, result, termination, totalMoves, playerColor, difficulty, gameMode } = body;

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as Profile | null;

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const playerRating = profile.rating;
  const opponentRating = gameMode === "ai" ? AI_RATINGS[difficulty] : playerRating;

  const playerWon =
    (result === "1-0" && playerColor === "w") || (result === "0-1" && playerColor === "b");
  const isDraw = result === "1/2-1/2";
  const actualScore = playerWon ? 1 : isDraw ? 0.5 : 0;

  const { newRating, change } =
    gameMode === "ai"
      ? calculateNewRating(playerRating, opponentRating, actualScore)
      : { newRating: playerRating, change: 0 };

  const whiteId = playerColor === "w" ? user.id : null;
  const blackId = playerColor === "b" ? user.id : null;
  const whiteRatingBefore = playerColor === "w" ? playerRating : opponentRating;
  const blackRatingBefore = playerColor === "b" ? playerRating : opponentRating;
  const whiteRatingAfter = playerColor === "w" ? newRating : opponentRating;
  const blackRatingAfter = playerColor === "b" ? newRating : opponentRating;

  const { data: gameRecord, error: gameError } = await supabase
    .from("games")
    .insert({
      mode: gameMode === "ai" ? `ai_${difficulty}` : "friend",
      pgn,
      result,
      termination,
      total_moves: totalMoves,
      white_id: whiteId,
      black_id: blackId,
      white_rating_before: whiteRatingBefore,
      black_rating_before: blackRatingBefore,
      white_rating_after: whiteRatingAfter,
      black_rating_after: blackRatingAfter,
    })
    .select("id")
    .single();

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 500 });
  }

  await supabase
    .from("profiles")
    .update({
      rating: newRating,
      wins: playerWon ? profile.wins + 1 : profile.wins,
      losses: !playerWon && !isDraw ? profile.losses + 1 : profile.losses,
      draws: isDraw ? profile.draws + 1 : profile.draws,
    })
    .eq("id", user.id);

  await supabase.from("rating_history").insert({
    user_id: user.id,
    game_id: gameRecord.id,
    rating_after: newRating,
    change,
  });

  const savedId =
    gameRecord && typeof (gameRecord as { id?: unknown }).id === "string"
      ? ((gameRecord as { id: string }).id)
      : null;

  return NextResponse.json({
    success: true,
    ratingChange: change,
    newRating,
    gameId: savedId,
  });
}
