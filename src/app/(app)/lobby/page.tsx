import { redirect } from "next/navigation";

import { LobbyClient } from "@/components/lobby/LobbyClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export default async function LobbyPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return <LobbyClient profile={data as Profile | null} />;
}
