"use client";

import { useState } from "react";

import { ProModal } from "@/components/ui/ProModal";

export function LockedCoachNavItem() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-ring rounded-xl px-4 py-2 text-sm font-semibold text-[var(--chess-cream-muted)] opacity-70 transition hover:bg-white/8 hover:text-[var(--chess-cream)] hover:opacity-100"
      >
        Coach
      </button>
      <ProModal
        featureName="AI coach"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
