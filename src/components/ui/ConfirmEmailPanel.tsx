"use client";

import { CheckCircle2, MailCheck, MoveRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ConfirmEmailPanel() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-[#d8cab6]/70 bg-[#f7eddc] p-8 text-[#1d170f] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <div className="mb-8 space-y-4">
        <span className="inline-flex rounded-full border border-[#4f7724]/20 bg-[#4f7724]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#4f7724]">
          One More Step
        </span>
        <div className="space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#79a83b] text-[#161008]">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-[#1d170f]">
            Confirm your email
          </h1>
          <p className="max-w-md text-sm leading-7 text-[#5c4f3f]">
            Your account was created, but this project requires email confirmation before the
            first login.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.25rem] border border-emerald-700/15 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Check your inbox{email ? ` for ${email}` : ""}.</p>
              <p className="mt-1">
                Open the confirmation email from Supabase and click the verification link. After
                that, come back here and log in.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-[#d8cab6] bg-white/70 px-4 py-4 text-sm leading-7 text-[#5c4f3f]">
          If you do not see the email, check spam or promotions first. If needed, return to
          register and try again with the same address after a minute.
        </div>

        <Link
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#79a83b] px-4 py-3.5 text-sm font-black text-[#161008] transition hover:bg-[#8fbd4a]"
          href="/login"
        >
          I confirmed my email
          <MoveRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
