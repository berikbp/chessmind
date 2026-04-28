export default function ReplayLoading() {
  return (
    <div className="mx-auto grid w-full max-w-6xl animate-pulse gap-4 px-4 py-6 lg:grid-cols-[auto_360px] lg:justify-center">
      {/* Board placeholder */}
      <div className="flex justify-center lg:justify-end">
        <div className="aspect-square w-full max-w-[520px] rounded-2xl bg-[var(--chess-panel-strong)]/60" />
      </div>
      {/* Sidebar placeholder */}
      <div className="flex w-full flex-col gap-3 rounded-[1.75rem] border border-[var(--chess-border)] bg-[var(--chess-panel-strong)]/40 p-4 lg:max-h-[calc(100svh-128px)]">
        <div className="h-16 rounded-xl bg-[var(--chess-panel-strong)]/60" />
        <div className="h-12 rounded-xl bg-[var(--chess-panel-strong)]/60" />
        <div className="h-10 rounded-xl bg-[var(--chess-panel-strong)]/60" />
        <div className="min-h-0 flex-1 rounded-xl bg-[var(--chess-panel-strong)]/60" />
        <div className="h-24 rounded-xl bg-[var(--chess-panel-strong)]/60" />
      </div>
    </div>
  );
}
