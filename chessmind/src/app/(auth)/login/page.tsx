import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/ui/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to ChessMind to continue your games and rating history.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-xl rounded-[2rem] border border-[var(--chess-border)] bg-[var(--chess-panel)]/85 p-8 text-sm text-[var(--chess-cream-muted)] shadow-2xl shadow-black/30 backdrop-blur">
          Loading sign-in form...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
