import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DailyUsageRecord } from "@/types";

export type DailyUsageKind = "coach_review" | "puzzle";

export const DAILY_COACH_REVIEW_LIMIT = 3;
export const DAILY_PUZZLE_LIMIT = 3;

const LIMIT_BY_KIND: Record<DailyUsageKind, number> = {
  coach_review: DAILY_COACH_REVIEW_LIMIT,
  puzzle: DAILY_PUZZLE_LIMIT,
};

const COLUMN_BY_KIND = {
  coach_review: "coach_review_uses",
  puzzle: "puzzle_uses",
} as const satisfies Record<DailyUsageKind, keyof DailyUsageRecord>;

export interface DailyLimitStatus {
  kind: DailyUsageKind;
  limit: number | null;
  remaining: number | null;
  resetsAt: string;
  usageDate: string;
  used: number;
}

export interface DailyUsageSummary {
  coachReview: DailyLimitStatus;
  puzzle: DailyLimitStatus;
  usageDate: string;
}

export function isDailyUsageSetupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("daily_usage") || message.includes("schema cache");
}

export function dailyUsageSetupMessage() {
  return "Daily limit table is not installed yet. Run supabase/step20_daily_usage.sql in Supabase SQL Editor.";
}

function getUtcUsageDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function getUtcResetTime(usageDate: string) {
  const reset = new Date(`${usageDate}T00:00:00.000Z`);
  reset.setUTCDate(reset.getUTCDate() + 1);
  return reset.toISOString();
}

function toLimitStatus({
  isPro,
  kind,
  row,
}: {
  isPro: boolean;
  kind: DailyUsageKind;
  row: DailyUsageRecord;
}): DailyLimitStatus {
  const used = row[COLUMN_BY_KIND[kind]] as number;
  const limit = isPro ? null : LIMIT_BY_KIND[kind];

  return {
    kind,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resetsAt: getUtcResetTime(row.usage_date),
    usageDate: row.usage_date,
    used,
  };
}

async function ensureDailyUsageRow(userId: string): Promise<DailyUsageRecord> {
  const adminSupabase = createAdminSupabaseClient();
  const usageDate = getUtcUsageDate();
  const { data, error } = await adminSupabase
    .from("daily_usage")
    .upsert(
      {
        usage_date: usageDate,
        user_id: userId,
      },
      { onConflict: "user_id,usage_date" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getDailyUsageSummary({
  isPro,
  userId,
}: {
  isPro: boolean;
  userId: string;
}): Promise<DailyUsageSummary> {
  const row = await ensureDailyUsageRow(userId);

  return {
    coachReview: toLimitStatus({ isPro, kind: "coach_review", row }),
    puzzle: toLimitStatus({ isPro, kind: "puzzle", row }),
    usageDate: row.usage_date,
  };
}

export async function consumeDailyUsage({
  isPro,
  kind,
  userId,
}: {
  isPro: boolean;
  kind: DailyUsageKind;
  userId: string;
}): Promise<{ allowed: boolean; status: DailyLimitStatus }> {
  const summary = await getDailyUsageSummary({ isPro, userId });
  const currentStatus = kind === "coach_review" ? summary.coachReview : summary.puzzle;

  if (isPro) return { allowed: true, status: currentStatus };
  if (currentStatus.remaining !== null && currentStatus.remaining <= 0) {
    return { allowed: false, status: currentStatus };
  }

  const adminSupabase = createAdminSupabaseClient();
  const nextUsed = currentStatus.used + 1;
  const updatePayload =
    kind === "coach_review"
      ? { coach_review_uses: nextUsed }
      : { puzzle_uses: nextUsed };
  const { data, error } = await adminSupabase
    .from("daily_usage")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("usage_date", currentStatus.usageDate)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return {
    allowed: true,
    status: toLimitStatus({ isPro, kind, row: data }),
  };
}
