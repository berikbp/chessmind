import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export default async function AppLayout({ children }: { children: ReactNode }) {
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

  return (
    <div className="chess-app-bg min-h-screen">
      <Navbar profile={data as Profile | null} />
      <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
