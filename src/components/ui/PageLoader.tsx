export function PageLoader() {
  return (
    <div
      className="flex min-h-[70svh] flex-col items-center justify-center px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-[var(--chess-border)] bg-[var(--chess-panel-strong)] shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <span className="absolute inset-[-5px] animate-spin rounded-[1.35rem] border-2 border-transparent border-t-[var(--chess-gold)]" />
        <span className="text-2xl font-black text-[var(--chess-green)]">♛</span>
      </div>
      <p className="mt-5 font-serif text-2xl font-black text-[var(--chess-cream)]">
        ChessMind
      </p>
      <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-[var(--chess-cream-muted)]">
        Preparing the board...
      </p>
    </div>
  );
}
