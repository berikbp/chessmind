"use client";

import { ArrowRight, LockKeyhole, Mail, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { initialAuthActionState } from "@/app/(auth)/auth-action-state";
import { registerAction } from "@/app/(auth)/actions";
import { KAZAKHSTAN_CITIES } from "@/lib/kz-cities";
import type { RegisterFormValues } from "@/types";

const inputClassName =
  "w-full rounded-[1.25rem] border border-[#d8cab6] bg-[#fffaf0] pl-12 pr-4 py-3.5 text-sm text-[#1d170f] outline-none transition placeholder:text-[#8e7d68] focus:border-[var(--chess-green)] focus:ring-2 focus:ring-[var(--chess-green)]/20";

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialAuthActionState,
  );

  useEffect(() => {
    if (state.redirectTo) router.push(state.redirectTo);
  }, [state.redirectTo, router]);
  const [formValues, setFormValues] = useState<RegisterFormValues>({
    city: "",
    confirmPassword: "",
    email: "",
    password: "",
    username: "",
  });

  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-[#d8cab6]/70 bg-[#f7eddc] p-8 text-[#1d170f] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <div className="mb-8 space-y-4">
        <span className="inline-flex rounded-full border border-[#4f7724]/20 bg-[#4f7724]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#4f7724]">
          New Account
        </span>
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-bold leading-tight text-[#1d170f]">Create account</h1>
          <p className="max-w-md text-sm leading-7 text-[#5c4f3f]">
            Set up your profile so your games, rating, and AI coach history have a home.
          </p>
        </div>
      </div>

      {state.error ? (
        <div className="mb-4 rounded-[1.25rem] border border-rose-700/15 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
          {state.error}
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#2d3748]">Username</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#907b60]" />
              <input
                autoCapitalize="none"
                autoComplete="username"
                className={inputClassName}
                maxLength={24}
                minLength={3}
                name="username"
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                placeholder="berik_96"
                required
                value={formValues.username}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#2d3748]">City</span>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#907b60]" />
              <input
                autoComplete="address-level2"
                className={inputClassName}
                list="kz-cities"
                name="city"
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                placeholder="Almaty"
                required
                value={formValues.city}
              />
            </div>
            <datalist id="kz-cities">
              {KAZAKHSTAN_CITIES.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </label>
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#2d3748]">Password</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#907b60]" />
              <input
                autoComplete="new-password"
                className={inputClassName}
                minLength={8}
                name="password"
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Create a strong password"
                required
                type="password"
                value={formValues.password}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#2d3748]">Confirm password</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#907b60]" />
              <input
                autoComplete="new-password"
                className={inputClassName}
                minLength={8}
                name="confirmPassword"
                onChange={(event) =>
                  setFormValues((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                placeholder="Repeat your password"
                required
                type="password"
                value={formValues.confirmPassword}
              />
            </div>
          </label>
        </div>

        <button
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#79a83b] px-4 py-3.5 text-sm font-black text-[#161008] transition hover:bg-[#8fbd4a] disabled:cursor-not-allowed disabled:bg-[#8ca36a]"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Creating account..." : "Create account"}
          {!isPending ? <ArrowRight className="h-4 w-4" /> : null}
        </button>


      </form>

      <p className="mt-6 text-sm text-[#5c4f3f]">
        Already registered?{" "}
        <Link className="font-bold text-[#4f7724] hover:text-[#395819]" href="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}
