import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { Database } from "@/types";

function getSupabaseServerEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { supabaseAnonKey, supabaseUrl };
}

// Used in Server Components and Server Actions.
// Calls cookies() lazily inside handlers so Next.js 16 can write cookies
// from Server Actions (the context must be live when set() is called).
export async function createServerSupabaseClient() {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseServerEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // In Server Components the cookie store is read-only; the proxy
          // middleware handles session refresh there.
        }
      },
    },
  });
}

// Used only in the proxy middleware (src/proxy.ts).
export function createProxySupabaseClient(request: NextRequest) {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseServerEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  return { response, supabase };
}
