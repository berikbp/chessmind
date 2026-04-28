export default function LeaderboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Hero */}
      <div className="wood-surface rounded-[2.25rem] border border-[var(--chess-border)] p-7 sm:p-8">
        <div className="h-6 w-24 rounded-full bg-[var(--chess-panel-strong)]/60" />
        <div className="mt-5 h-14 w-80 rounded-xl bg-[var(--chess-panel-strong)]/60" />
        <div className="mt-5 h-4 w-full max-w-2xl rounded bg-[var(--chess-panel-strong)]/60" />
        <div className="mt-2 h-4 w-3/4 max-w-xl rounded bg-[var(--chess-panel-strong)]/60" />
      </div>
      {/* Table */}
      <div className="rounded-[2.25rem] border border-[var(--chess-border)] bg-[var(--chess-panel-strong)]/40 p-4">
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl px-4 py-3">
              <div className="h-6 w-8 rounded bg-[var(--chess-panel-strong)]/60" />
              <div className="h-8 w-8 rounded-full bg-[var(--chess-panel-strong)]/60" />
              <div className="h-4 flex-1 rounded bg-[var(--chess-panel-strong)]/60" />
              <div className="h-6 w-16 rounded bg-[var(--chess-panel-strong)]/60" />
              <div className="h-6 w-16 rounded bg-[var(--chess-panel-strong)]/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
