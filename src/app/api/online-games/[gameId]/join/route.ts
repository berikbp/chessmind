import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OnlineGameRecord } from "@/types";

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  const [{ gameId }, supabase] = await Promise.all([
    context.params,
    createServerSupabaseClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: game, error } = await admin
    .from("online_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Online game not found." }, { status: 404 });
  }

  const onlineGame = game as OnlineGameRecord;

  if (onlineGame.white_id === user.id || onlineGame.black_id === user.id) {
    return NextResponse.json({ game: onlineGame });
  }

  if (onlineGame.status !== "waiting") {
    return NextResponse.json({ error: "This invite is no longer open." }, { status: 409 });
  }

  if (onlineGame.white_id && onlineGame.black_id) {
    return NextResponse.json({ error: "This game already has two players." }, { status: 409 });
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
  const { data: updatedGame, error: updateError } = await admin
    .from("online_games")
    .update(joinUpdate)
    .eq("id", gameId)
    .eq("status", "waiting")
    .select("*")
    .single();

  if (updateError || !updatedGame) {
    return NextResponse.json(
      { error: updateError?.message ?? "Could not join this game." },
      { status: 500 },
    );
  }

  return NextResponse.json({ game: updatedGame as OnlineGameRecord });
}
