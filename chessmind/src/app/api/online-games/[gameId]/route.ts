import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OnlineGameRecord, Profile } from "@/types";

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

function toOnlinePlayer(profile: Profile | undefined) {
  if (!profile) return null;
  return {
    id: profile.id,
    rating: profile.rating,
    username: profile.username,
  };
}

export async function GET(_req: Request, context: RouteContext) {
  const [{ gameId }, supabase] = await Promise.all([
    context.params,
    createServerSupabaseClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: rawGame, error } = await admin
    .from("online_games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error || !rawGame) {
    return NextResponse.json({ error: "Online game not found." }, { status: 404 });
  }

  const game = rawGame as OnlineGameRecord;
  if (game.white_id !== user.id && game.black_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profileIds = [game.white_id, game.black_id].filter(Boolean) as string[];
  const { data: profiles } = profileIds.length
    ? await admin.from("profiles").select("*").in("id", profileIds)
    : { data: [] };
  const typedProfiles = (profiles ?? []) as Profile[];

  return NextResponse.json({
    blackProfile: toOnlinePlayer(typedProfiles.find((profile) => profile.id === game.black_id)),
    game,
    whiteProfile: toOnlinePlayer(typedProfiles.find((profile) => profile.id === game.white_id)),
  });
}
