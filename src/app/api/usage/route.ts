import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  dailyUsageSetupMessage,
  getDailyUsageSummary,
  isDailyUsageSetupError,
} from "@/lib/usage/daily-limits";
import type { Profile } from "@/types";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rawProfile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as Profile | null;

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  let usage;
  try {
    usage = await getDailyUsageSummary({
      isPro: profile.is_pro,
      userId: user.id,
    });
  } catch (usageError) {
    if (isDailyUsageSetupError(usageError)) {
      return NextResponse.json(
        {
          code: "DAILY_USAGE_NOT_CONFIGURED",
          error: dailyUsageSetupMessage(),
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          usageError instanceof Error
            ? usageError.message
            : "Daily usage tracking is not configured.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    coachReview: usage.coachReview,
    isPro: profile.is_pro,
    puzzle: usage.puzzle,
    usageDate: usage.usageDate,
  });
}
