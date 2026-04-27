import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DAILY_PUZZLE_LIMIT,
  consumeDailyUsage,
  dailyUsageSetupMessage,
  isDailyUsageSetupError,
} from "@/lib/usage/daily-limits";
import type { Profile } from "@/types";

export async function POST() {
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

  let dailyUse;
  try {
    dailyUse = await consumeDailyUsage({
      isPro: profile.is_pro,
      kind: "puzzle",
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

  if (!dailyUse.allowed) {
    return NextResponse.json(
      {
        code: "PUZZLE_LIMIT_REACHED",
        error: "Daily free puzzle limit reached.",
        isPro: profile.is_pro,
        limit: DAILY_PUZZLE_LIMIT,
        resetsAt: dailyUse.status.resetsAt,
        usageDate: dailyUse.status.usageDate,
        usesRemaining: 0,
        usesToday: dailyUse.status.used,
      },
      { status: 429 },
    );
  }

  return NextResponse.json({
    isPro: profile.is_pro,
    limit: dailyUse.status.limit,
    resetsAt: dailyUse.status.resetsAt,
    usageDate: dailyUse.status.usageDate,
    usesRemaining: dailyUse.status.remaining,
    usesToday: dailyUse.status.used,
  });
}
