export default function OnlineGameLoading() {
  return (
    <div className="mx-auto grid w-full max-w-6xl animate-pulse gap-5 px-4 py-6 lg:grid-cols-[556px_minmax(0,420px)] lg:justify-center">
      {/* Board placeholder */}
      <div className="aspect-square w-full max-w-[556px] rounded-[1.5rem] bg-[var(--chess-panel-strong)]/60" />
      {/* Sidebar placeholder */}
      <div className="flex w-full flex-col gap-3 rounded-[1.75rem] border border-[var(--chess-border)] bg-[var(--chess-panel-strong)]/40 p-4">
        <div className="h-14 rounded-xl bg-[var(--chess-panel-strong)]/60" />
        <div className="min-h-0 flex-1 rounded-xl bg-[var(--chess-panel-strong)]/60" />
        <div className="h-14 rounded-xl bg-[var(--chess-panel-strong)]/60" />
      </div>
    </div>
  );
}
