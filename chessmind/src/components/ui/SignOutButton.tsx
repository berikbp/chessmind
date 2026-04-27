"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    setErrorMessage(null);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        className="focus-ring rounded-2xl border border-[var(--chess-border)] bg-white/[0.045] px-4 py-2 text-sm font-semibold text-[var(--chess-cream)] transition hover:border-[var(--chess-gold)]/45 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleSignOut}
        type="button"
      >
        {isPending ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? (
        <p className="max-w-xs text-right text-xs text-rose-300">{errorMessage}</p>
      ) : null}
    </div>
  );
}
