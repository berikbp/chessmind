export default function LobbyLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-48 rounded bg-[var(--chess-panel-strong)]/60" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-48 rounded-2xl bg-[var(--chess-panel-strong)]/60"
          />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-[var(--chess-panel-strong)]/60" />
    </div>
  );
}
