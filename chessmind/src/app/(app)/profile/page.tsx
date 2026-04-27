import { redirect } from "next/navigation";

import { ProfileClient } from "@/components/profile/ProfileClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GameRecord, Profile } from "@/types";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profileData }, { data: recentGamesData }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("games")
        .select("*")
        .or(`white_id.eq.${user.id},black_id.eq.${user.id}`)
        .order("played_at", { ascending: false })
        .limit(10),
    ]);

  if (!profileData) redirect("/login");

  return (
    <ProfileClient
      profile={profileData as Profile}
      recentGames={(recentGamesData ?? []) as GameRecord[]}
      userId={user.id}
    />
  );
}
