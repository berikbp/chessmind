"use client";

import { ArrowRight, Mail, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { initialAuthActionState } from "@/app/(auth)/auth-action-state";
import { loginAction } from "@/app/(auth)/actions";
import type { LoginFormValues } from "@/types";

const inputClassName =
  "w-full rounded-[1.25rem] border border-[#d8cab6] bg-[#fffaf0] pl-12 pr-4 py-3.5 text-sm text-[#1d170f] outline-none transition placeholder:text-[#8e7d68] focus:border-[var(--chess-green)] focus:ring-2 focus:ring-[var(--chess-green)]/20";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, initialAuthActionState);

  useEffect(() => {
    if (state.redirectTo) router.push(state.redirectTo);
  }, [state.redirectTo, router]);
  const [formValues, setFormValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });

  const notice = useMemo(() => {
    const message = searchParams.get("message");
    const redirectedFrom = searchParams.get("redirectedFrom");

    if (message) {
      return message;
    }

    if (redirectedFrom) {
      return "Sign in to continue to your ChessMind workspace.";
    }

    return null;
  }, [searchParams]);

  useEffect(() => {
    if (!state.error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("email");
      url.searchParams.delete("password");
      window.history.replaceState({}, "", url.toString());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [state.error]);

  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-[#d8cab6]/70 bg-[#f7eddc] p-8 text-[#1d170f] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <div className="mb-8 space-y-4">
        <span className="inline-flex rounded-full border border-[#4f7724]/20 bg-[#4f7724]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#4f7724]">
          Returning Player
        </span>
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-bold leading-tight text-[#1d170f]">Log in</h1>
          <p className="max-w-md text-sm leading-7 text-[#5c4f3f]">
            Continue to your rating history, saved games, and coaching notes.
          </p>
        </div>
      </div>

      {notice ? (
        <div className="mb-4 rounded-[1.25rem] border border-emerald-700/15 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}

      {state.error ? (
        <div className="mb-4 rounded-[1.25rem] border border-rose-700/15 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {state.error}
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectedFrom" value={searchParams.get("redirectedFrom") ?? ""} />
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#2d3748]">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#907b60]" />
            <input
              autoCapitalize="none"
              autoComplete="email"
              className={inputClassName}
              name="email"
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="you@example.com"
              required
              type="email"
              value={formValues.email}
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#2d3748]">Password</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#907b60]" />
            <input
              autoComplete="current-password"
              className={inputClassName}
              minLength={8}
              name="password"
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="Enter your password"
              required
              type="password"
              value={formValues.password}
            />
          </div>
        </label>

        <button
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#79a83b] px-4 py-3.5 text-sm font-black text-[#161008] transition hover:bg-[#8fbd4a] disabled:cursor-not-allowed disabled:bg-[#8ca36a]"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Logging in..." : "Log in"}
          {!isPending ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </form>

      <p className="mt-6 text-sm text-[#5c4f3f]">
        Need an account?{" "}
        <Link className="font-bold text-[#4f7724] hover:text-[#395819]" href="/register">
          Create one
        </Link>
      </p>
    </section>
  );
}
