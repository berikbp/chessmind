"use client";

import { useState } from "react";
import { Crown } from "lucide-react";

import { ProModal } from "@/components/ui/ProModal";

export function LockedCoachNavItem() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-[var(--chess-gold)] transition hover:bg-[var(--chess-gold)]/10 hover:text-[var(--chess-cream)]"
      >
        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
        Pro
      </button>
      <ProModal
        featureName="Pro plan"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
