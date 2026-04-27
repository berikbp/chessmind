"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { Check, Crown, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProModalProps {
  featureName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  "Unlimited daily puzzles and coach explanations",
  "Deeper Stockfish review with coach-style summaries",
  "Unlimited AI coach analyses when the coach panel returns",
  "Advanced progress tracking across saved games",
];

const PRICING = [
  { label: "Monthly", price: "$4.99", note: "Flexible access" },
  { label: "Yearly", price: "$39", note: "Saves 35%" },
];

type PromoStatus = "idle" | "submitting" | "success" | "error";

interface PromoRedeemResponse {
  error?: string;
  success?: boolean;
}

export function ProModal({ featureName = "this feature", isOpen, onClose }: ProModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [notice, setNotice] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoStatus, setPromoStatus] = useState<PromoStatus>("idle");

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  async function handlePromoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = promoCode.trim();
    if (!code || promoStatus === "submitting") return;

    setNotice(null);
    setPromoStatus("submitting");
    setPromoMessage(null);

    try {
      const response = await fetch("/api/pro/redeem", {
        body: JSON.stringify({ code }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as PromoRedeemResponse;

      if (!response.ok || !result.success) {
        setPromoStatus("error");
        setPromoMessage(result.error ?? "Promo code could not be redeemed.");
        return;
      }

      setPromoStatus("success");
      setPromoMessage("Pro unlocked. Your account now has Pro access.");
      setNotice("Pro unlocked with promo code!");
      router.refresh();
    } catch {
      setPromoStatus("error");
      setPromoMessage("Could not reach the promo server. Try again.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close Pro modal"
        className="absolute inset-0 cursor-default bg-black/72 backdrop-blur-md"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="wood-surface relative z-10 max-h-[calc(100svh-32px)] w-full max-w-4xl overflow-y-auto rounded-[2.25rem] border border-[var(--chess-border)] shadow-[0_30px_90px_rgba(0,0,0,0.58)]"
      >
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[var(--chess-gold)]/12 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[var(--chess-green)]/12 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="focus-ring absolute right-4 top-4 z-20 rounded-2xl border border-[var(--chess-border)] bg-black/25 p-2.5 text-[var(--chess-cream-muted)] transition hover:bg-white/[0.08] hover:text-[var(--chess-cream)]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--chess-gold)]/35 bg-[var(--chess-gold)]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--chess-gold)]">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              ChessMind Pro
            </span>

            <h2
              id={titleId}
              className="mt-5 font-display text-4xl font-bold leading-[0.95] tracking-tight text-[var(--chess-cream)] sm:text-5xl"
            >
              Unlock {featureName}.
            </h2>
            <p id={descriptionId} className="mt-4 max-w-xl text-base leading-8 text-[var(--chess-cream-muted)]">
              Pro is the upgrade layer for competitive features. Payments are not wired yet, so
              the upgrade button currently shows a Stripe placeholder.
            </p>

            <div className="mt-6 grid gap-3">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-2xl border border-[var(--chess-border)] bg-black/18 p-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--chess-green)] text-[#141009]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold leading-6 text-[var(--chess-cream)]">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--chess-border)] bg-black/20 p-4 sm:p-5">
            <div className="flex items-start gap-3 rounded-[1.5rem] border border-[var(--chess-gold)]/25 bg-[var(--chess-gold)]/10 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
              <div>
                <p className="font-bold text-[var(--chess-cream)]">No charge today</p>
                <p className="mt-1 text-sm leading-6 text-[var(--chess-cream-muted)]">
                  Stripe integration is a later step. This modal only proves the upgrade flow.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {PRICING.map((plan) => (
                <button
                  key={plan.label}
                  type="button"
                  onClick={() => setNotice("Stripe integration coming soon!")}
                  className="focus-ring group min-h-24 rounded-[1.5rem] border border-[var(--chess-border)] bg-white/[0.045] p-4 text-left transition hover:border-[var(--chess-gold)]/45 hover:bg-white/[0.075]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[var(--chess-cream)]">{plan.label}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
                        {plan.note}
                      </p>
                    </div>
                    <p className="font-display text-3xl font-bold text-[var(--chess-gold)]">
                      {plan.price}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setNotice("Stripe integration coming soon!")}
              className="focus-ring mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-4 py-3 text-sm font-black text-[#141009] transition hover:bg-[#8fbd4a] active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              Upgrade to Pro
            </button>

            <form
              onSubmit={handlePromoSubmit}
              className="mt-4 rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4"
            >
              <label
                htmlFor="pro-promo-code"
                className="text-xs font-black uppercase tracking-[0.2em] text-[var(--chess-cream-muted)]"
              >
                Promo code
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  id="pro-promo-code"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value);
                    if (promoStatus !== "submitting") {
                      setPromoStatus("idle");
                      setPromoMessage(null);
                    }
                  }}
                  autoComplete="off"
                  placeholder="Enter promo code"
                  className="focus-ring min-h-12 flex-1 rounded-2xl border border-[var(--chess-border)] bg-[#141009]/80 px-4 text-sm font-bold text-[var(--chess-cream)] outline-none placeholder:text-[var(--chess-cream-muted)]/55"
                />
                <button
                  type="submit"
                  disabled={!promoCode.trim() || promoStatus === "submitting"}
                  className="focus-ring min-h-12 rounded-2xl border border-[var(--chess-green)]/40 bg-[var(--chess-green)]/18 px-5 text-sm font-black text-[var(--chess-green)] transition hover:bg-[var(--chess-green)]/25 disabled:cursor-not-allowed disabled:border-[var(--chess-border)] disabled:bg-white/[0.04] disabled:text-[var(--chess-cream-muted)]"
                >
                  {promoStatus === "submitting" ? "Checking..." : "Redeem"}
                </button>
              </div>
              {promoMessage ? (
                <p
                  role="status"
                  aria-live="polite"
                  className={`mt-3 text-sm font-bold ${
                    promoStatus === "success"
                      ? "text-[var(--chess-green)]"
                      : "text-[#ff8b74]"
                  }`}
                >
                  {promoMessage}
                </p>
              ) : null}
            </form>

            {notice ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--chess-green)]/30 bg-[var(--chess-green)]/12 px-4 py-3 text-sm font-bold text-[var(--chess-green)]"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {notice}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
