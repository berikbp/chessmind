import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

interface UpdateProfileBody {
  city?: string;
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as UpdateProfileBody;
  const city = body.city?.trim();

  if (!city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ city })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
