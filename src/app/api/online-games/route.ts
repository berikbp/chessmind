import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OnlineGameRecord } from "@/types";

type HostColor = "w" | "b";

interface CreateOnlineGameBody {
  hostColor?: HostColor;
  timeControl?: string;
}

const TIME_CONTROL_PATTERN = /^(\d{1,3})\+(\d{1,2})$/;

function createInviteCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

function parseInitialSeconds(timeControl: string) {
  if (!TIME_CONTROL_PATTERN.test(timeControl)) return null;
  const [minutes] = timeControl.split("+").map(Number);
  return minutes * 60;
}

function normalizeTimeControl(value: string | undefined) {
  if (!value || value === "untimed") return "untimed";
  return TIME_CONTROL_PATTERN.test(value) ? value : "untimed";
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as CreateOnlineGameBody;
  const hostColor: HostColor = body.hostColor === "b" ? "b" : "w";
  const timeControl = normalizeTimeControl(body.timeControl);
  const initialSeconds = parseInitialSeconds(timeControl);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();
    const { data, error } = await supabase
      .from("online_games")
      .insert({
        black_id: hostColor === "b" ? user.id : null,
        black_time: initialSeconds,
        host_id: user.id,
        invite_code: inviteCode,
        status: "waiting",
        time_control: timeControl,
        white_id: hostColor === "w" ? user.id : null,
        white_time: initialSeconds,
      })
      .select("*")
      .single();

    if (!error && data) {
      return NextResponse.json({ game: data as OnlineGameRecord });
    }

    if (error?.code !== "23505") {
      return NextResponse.json(
        { error: error?.message ?? "Could not create online game." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Could not create a unique invite code." }, { status: 500 });
}
