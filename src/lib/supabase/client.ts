import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types";

function getSupabaseBrowserEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { supabaseAnonKey, supabaseUrl };
}

export function createBrowserSupabaseClient() {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseBrowserEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
