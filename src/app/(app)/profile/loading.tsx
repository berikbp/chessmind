export default function ProfileLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Profile header */}
      <div className="rounded-[2.25rem] border border-[var(--chess-border)] bg-[var(--chess-panel-strong)]/60 p-7 sm:p-8">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 flex-shrink-0 rounded-full bg-[var(--chess-panel-strong)]" />
          <div className="space-y-3">
            <div className="h-7 w-48 rounded bg-[var(--chess-panel-strong)]" />
            <div className="h-4 w-32 rounded bg-[var(--chess-panel-strong)]" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-[var(--chess-panel-strong)]"
            />
          ))}
        </div>
      </div>
      {/* Recent games */}
      <div className="rounded-[2.25rem] border border-[var(--chess-border)] bg-[var(--chess-panel-strong)]/60 p-7 sm:p-8">
        <div className="mb-5 h-6 w-36 rounded bg-[var(--chess-panel-strong)]" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[var(--chess-panel-strong)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-[var(--chess-panel-strong)]" />
                <div className="h-3 w-1/3 rounded bg-[var(--chess-panel-strong)]" />
              </div>
              <div className="h-8 w-16 rounded-lg bg-[var(--chess-panel-strong)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
