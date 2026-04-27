import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface RedeemPromoBody {
  code?: string;
}

const PROMO_CODE = process.env.PRO_PROMO_CODE ?? "qwerty123";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as RedeemPromoBody | null;
  const code = body?.code?.trim();

  if (!code) {
    return NextResponse.json({ error: "Promo code is required." }, { status: 400 });
  }

  if (code !== PROMO_CODE) {
    return NextResponse.json({ error: "Invalid promo code." }, { status: 403 });
  }

  const adminSupabase = createAdminSupabaseClient();

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ is_pro: true })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data, success: true });
}
