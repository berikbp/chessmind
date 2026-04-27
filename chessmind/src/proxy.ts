import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createProxySupabaseClient } from "@/lib/supabase/server";

const AUTH_ROUTES = ["/confirm-email", "/login", "/register"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { response, supabase } = createProxySupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isAuthRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/lobby", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
