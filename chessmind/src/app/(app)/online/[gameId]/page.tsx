import { redirect } from "next/navigation";

import { OnlineGameClient } from "@/components/online/OnlineGameClient";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OnlineGameRecord, Profile } from "@/types";

interface PageProps {
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

export default async function OnlineGamePage({ params }: PageProps) {
  const [{ gameId }, supabase] = await Promise.all([
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
    .eq("id", gameId)
    .maybeSingle();

  if (!rawGame) redirect("/lobby");

  const onlineGame = rawGame as OnlineGameRecord;
  const isParticipant = onlineGame.white_id === user.id || onlineGame.black_id === user.id;

  if (!isParticipant && onlineGame.status === "waiting") {
    redirect(`/online/join/${onlineGame.invite_code}`);
  }

  if (!isParticipant) redirect("/lobby");

  const profileIds = [onlineGame.white_id, onlineGame.black_id, user.id].filter(Boolean) as string[];
  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .in("id", profileIds);

  const typedProfiles = (profiles ?? []) as Profile[];
  const whiteProfile = toOnlinePlayer(
    typedProfiles.find((profile) => profile.id === onlineGame.white_id),
  );
  const blackProfile = toOnlinePlayer(
    typedProfiles.find((profile) => profile.id === onlineGame.black_id),
  );
  const currentUserProfile =
    typedProfiles.find((profile) => profile.id === user.id) ?? null;

  return (
    <div className="flex min-h-[calc(100svh-112px)] justify-center overflow-visible py-0 lg:h-[calc(100svh-132px)] lg:min-h-[560px] lg:overflow-hidden">
      <OnlineGameClient
        blackProfile={blackProfile}
        currentUserId={user.id}
        currentUserProfile={currentUserProfile}
        initialGame={onlineGame}
        whiteProfile={whiteProfile}
      />
    </div>
  );
}
