import { BrainCircuit, ShieldCheck, Trophy } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="chess-app-bg relative min-h-screen overflow-hidden text-[var(--chess-cream)]">
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(45deg,rgba(247,237,220,0.08)_25%,transparent_25%,transparent_75%,rgba(247,237,220,0.08)_75%),linear-gradient(45deg,rgba(247,237,220,0.08)_25%,transparent_25%,transparent_75%,rgba(247,237,220,0.08)_75%)] [background-position:0_0,18px_18px] [background-size:36px_36px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-12 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="flex flex-col justify-center gap-10">
          <div className="space-y-5">
            <span className="inline-flex w-fit rounded-full border border-[var(--chess-gold)]/30 bg-black/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--chess-gold)]">
              ChessMind
            </span>
            <div className="space-y-5">
              <h1 className="font-display max-w-3xl text-5xl font-bold leading-[0.95] tracking-tight text-[var(--chess-cream)] sm:text-6xl lg:text-7xl">
                Learn why the move failed, not just that it failed.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--chess-cream-muted)] sm:text-lg">
                A calmer chess workspace with fast games, saved ratings, Stockfish review, and AI
                explanations that turn key mistakes into concrete lessons.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-[1.75rem] border border-[var(--chess-border)] bg-white/[0.045] p-5 backdrop-blur-sm">
              <Trophy className="h-5 w-5 text-[var(--chess-gold)]" />
              <p className="mt-4 text-sm font-bold text-[var(--chess-cream)]">Rated progress</p>
              <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">
                Profiles carry ratings, wins, losses, draws, and city context from the first game.
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[var(--chess-border)] bg-white/[0.045] p-5 backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 text-[var(--chess-gold)]" />
              <p className="mt-4 text-sm font-bold text-[var(--chess-cream)]">Protected play</p>
              <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">
                Sessions gate the app before game history, review pages, or coach usage renders.
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[var(--chess-border)] bg-white/[0.045] p-5 backdrop-blur-sm">
              <BrainCircuit className="h-5 w-5 text-[var(--chess-gold)]" />
              <p className="mt-4 text-sm font-bold text-[var(--chess-cream)]">Hybrid review</p>
              <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">
                Stockfish identifies the mistake; the coach explains the missed idea and better plan.
              </p>
            </article>
          </div>

          <aside className="max-w-2xl rounded-[2rem] border border-[var(--chess-gold)]/20 bg-black/20 p-6 backdrop-blur-sm">
            <p className="font-display text-2xl font-bold leading-tight text-[var(--chess-gold)]">
              “Lichess shows you what the blunder was. ChessMind tells you why.”
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--chess-cream-muted)]">
              Stockfish marks the objective swing, then ChessMind turns the moment into a lesson
              you can replay on the board.
            </p>
          </aside>
        </section>

        <div className="flex items-center justify-center lg:justify-end">{children}</div>
      </div>
    </div>
  );
}
