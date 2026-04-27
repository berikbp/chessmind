import { NextResponse } from "next/server";

import { calculateNewRating } from "@/lib/chess/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json, OnlineGameRecord, Profile } from "@/types";

type GameResult = "1-0" | "0-1" | "1/2-1/2";

interface CompleteOnlineGameBody {
  blackTime?: number | null;
  fen?: string;
  lastMove?: Json | null;
  pgn?: string;
  result?: GameResult;
  termination?: string;
  totalMoves?: number;
  turn?: "w" | "b";
  whiteTime?: number | null;
}

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

function isGameResult(value: unknown): value is GameResult {
  return value === "1-0" || value === "0-1" || value === "1/2-1/2";
}

function scoreFor(result: GameResult, color: "w" | "b") {
  if (result === "1/2-1/2") return 0.5;
  if (result === "1-0") return color === "w" ? 1 : 0;
  return color === "b" ? 1 : 0;
}

function nextStats(profile: Profile, result: GameResult, color: "w" | "b", rating: number) {
  const score = scoreFor(result, color);
  return {
    draws: score === 0.5 ? profile.draws + 1 : profile.draws,
    losses: score === 0 ? profile.losses + 1 : profile.losses,
    rating,
    wins: score === 1 ? profile.wins + 1 : profile.wins,
  };
}

export async function POST(req: Request, context: RouteContext) {
  const [{ gameId }, supabase] = await Promise.all([
    context.params,
    createServerSupabaseClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as CompleteOnlineGameBody;
  if (!isGameResult(body.result)) {
    return NextResponse.json({ error: "Valid result is required." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: rawGame, error: gameError } = await admin
    .from("online_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !rawGame) {
    return NextResponse.json({ error: "Online game not found." }, { status: 404 });
  }

  const onlineGame = rawGame as OnlineGameRecord;
  if (onlineGame.white_id !== user.id && onlineGame.black_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!onlineGame.white_id || !onlineGame.black_id) {
    return NextResponse.json({ error: "Game needs two players before it can be saved." }, { status: 409 });
  }

  if (onlineGame.saved_game_id) {
    return NextResponse.json({ success: true, gameId: onlineGame.saved_game_id });
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("*")
    .in("id", [onlineGame.white_id, onlineGame.black_id]);

  if (profilesError || !profiles) {
    return NextResponse.json(
      { error: profilesError?.message ?? "Could not load player profiles." },
      { status: 500 },
    );
  }

  const whiteProfile = (profiles as Profile[]).find((profile) => profile.id === onlineGame.white_id);
  const blackProfile = (profiles as Profile[]).find((profile) => profile.id === onlineGame.black_id);

  if (!whiteProfile || !blackProfile) {
    return NextResponse.json({ error: "Player profile missing." }, { status: 404 });
  }

  const whiteRating = calculateNewRating(
    whiteProfile.rating,
    blackProfile.rating,
    scoreFor(body.result, "w"),
  );
  const blackRating = calculateNewRating(
    blackProfile.rating,
    whiteProfile.rating,
    scoreFor(body.result, "b"),
  );

  const totalMoves =
    typeof body.totalMoves === "number" && Number.isFinite(body.totalMoves)
      ? Math.max(0, Math.round(body.totalMoves))
      : null;

  const { data: savedGame, error: saveError } = await admin
    .from("games")
    .insert({
      black_id: blackProfile.id,
      black_rating_after: blackRating.newRating,
      black_rating_before: blackProfile.rating,
      mode: "online_friend",
      pgn: body.pgn ?? onlineGame.pgn,
      result: body.result,
      termination: body.termination ?? "game over",
      total_moves: totalMoves,
      white_id: whiteProfile.id,
      white_rating_after: whiteRating.newRating,
      white_rating_before: whiteProfile.rating,
    })
    .select("id")
    .single();

  if (saveError || !savedGame) {
    return NextResponse.json(
      { error: saveError?.message ?? "Could not save completed game." },
      { status: 500 },
    );
  }

  await Promise.all([
    admin
      .from("profiles")
      .update(nextStats(whiteProfile, body.result, "w", whiteRating.newRating))
      .eq("id", whiteProfile.id),
    admin
      .from("profiles")
      .update(nextStats(blackProfile, body.result, "b", blackRating.newRating))
      .eq("id", blackProfile.id),
    admin.from("rating_history").insert([
      {
        change: whiteRating.change,
        game_id: savedGame.id,
        rating_after: whiteRating.newRating,
        user_id: whiteProfile.id,
      },
      {
        change: blackRating.change,
        game_id: savedGame.id,
        rating_after: blackRating.newRating,
        user_id: blackProfile.id,
      },
    ]),
  ]);

  const { data: completedGame } = await admin
    .from("online_games")
    .update({
      black_time: body.blackTime ?? onlineGame.black_time,
      completed_at: new Date().toISOString(),
      fen: body.fen ?? onlineGame.fen,
      last_move: body.lastMove ?? onlineGame.last_move,
      last_move_at: new Date().toISOString(),
      pgn: body.pgn ?? onlineGame.pgn,
      result: body.result,
      saved_game_id: savedGame.id,
      status: "completed",
      termination: body.termination ?? "game over",
      turn: body.turn ?? onlineGame.turn,
      version: onlineGame.version + 1,
      white_time: body.whiteTime ?? onlineGame.white_time,
    })
    .eq("id", gameId)
    .select("*")
    .single();

  return NextResponse.json({
    blackRatingChange: blackRating.change,
    game: completedGame as OnlineGameRecord | null,
    gameId: savedGame.id,
    success: true,
    whiteRatingChange: whiteRating.change,
  });
}
