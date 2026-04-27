import type { Metadata } from "next";
import { Suspense } from "react";

import { ConfirmEmailPanel } from "@/components/ui/ConfirmEmailPanel";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm your email address before logging in to ChessMind.",
};

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-xl rounded-[2rem] border border-[#d8cab6]/70 bg-[#f7eddc] p-8 text-sm text-[#5c4f3f] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
          Loading confirmation details...
        </div>
      }
    >
      <ConfirmEmailPanel />
    </Suspense>
  );
}
