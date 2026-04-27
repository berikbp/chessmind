import Link from "next/link";
import { Swords } from "lucide-react";

import type { GameRecord } from "@/types";

function getGamePerspective(game: GameRecord, userId: string) {
  const playerIsWhite = game.white_id === userId;
  const ratingBefore = playerIsWhite ? game.white_rating_before : game.black_rating_before;
  const ratingAfter = playerIsWhite ? game.white_rating_after : game.black_rating_after;
  const ratingChange = ratingBefore != null && ratingAfter != null ? ratingAfter - ratingBefore : 0;
  const playerWon =
    (game.result === "1-0" && playerIsWhite) || (game.result === "0-1" && !playerIsWhite);
  const isDraw = game.result === "1/2-1/2";

  return {
    color: playerIsWhite ? "White" : "Black",
    opponent: game.mode.startsWith("ai_")
      ? game.mode.replace("ai_", "AI ").toUpperCase()
      : "Friend",
    ratingChange,
    resultLabel: isDraw ? "Draw" : playerWon ? "Win" : "Loss",
    resultTone: isDraw
      ? "text-[var(--chess-cream-muted)]"
      : playerWon
        ? "text-[#a8cf6a]"
        : "text-[#eaa29b]",
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function RecentGamesTable({ games, userId }: { games: GameRecord[]; userId: string }) {
  return (
    <section className="card-surface overflow-hidden rounded-[2rem]">
      <div className="border-b border-[var(--chess-border)] p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--chess-green)]">
          History
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold text-[var(--chess-cream)]">
          Recent games
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--chess-border)] text-left text-[11px] font-black uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Opponent</th>
              <th className="px-5 py-4">Result</th>
              <th className="px-5 py-4 text-right">Moves</th>
              <th className="px-5 py-4 text-right">Rating</th>
              <th className="px-5 py-4 text-right">Review</th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-sm font-semibold text-[var(--chess-cream-muted)]"
                >
                  No saved games yet.
                </td>
              </tr>
            ) : (
              games.map((game) => {
                const perspective = getGamePerspective(game, userId);
                const replayHref = `/game/replay/${game.id}`;
                const reviewHref = `/game/review/${game.id}`;
                const canReview = Boolean(game.pgn);

                return (
                  <tr
                    key={game.id}
                    className="group border-b border-[var(--chess-border)] text-sm text-[var(--chess-cream-muted)] transition last:border-b-0 hover:bg-white/[0.035]"
                  >
                    <td className="font-semibold">
                      {canReview ? (
                        <Link href={replayHref} className="block px-5 py-4">
                          {formatDate(game.played_at)}
                        </Link>
                      ) : (
                        <span className="block px-5 py-4">{formatDate(game.played_at)}</span>
                      )}
                    </td>
                    <td>
                      {canReview ? (
                        <Link href={replayHref} className="block px-5 py-4">
                          <GameOpponent perspective={perspective} />
                        </Link>
                      ) : (
                        <div className="px-5 py-4">
                          <GameOpponent perspective={perspective} />
                        </div>
                      )}
                    </td>
                    <td className={`font-black ${perspective.resultTone}`}>
                      {canReview ? (
                        <Link href={replayHref} className="block px-5 py-4">
                          {perspective.resultLabel}
                        </Link>
                      ) : (
                        <span className="block px-5 py-4">{perspective.resultLabel}</span>
                      )}
                    </td>
                    <td className="text-right font-semibold">
                      {canReview ? (
                        <Link href={replayHref} className="block px-5 py-4">
                          {game.total_moves ?? 0}
                        </Link>
                      ) : (
                        <span className="block px-5 py-4">{game.total_moves ?? 0}</span>
                      )}
                    </td>
                    <td
                      className={`text-right font-black ${
                        perspective.ratingChange >= 0 ? "text-[#a8cf6a]" : "text-[#eaa29b]"
                      }`}
                    >
                      {canReview ? (
                        <Link href={replayHref} className="block px-5 py-4">
                          {perspective.ratingChange >= 0 ? "+" : ""}
                          {perspective.ratingChange}
                        </Link>
                      ) : (
                        <span className="block px-5 py-4">
                          {perspective.ratingChange >= 0 ? "+" : ""}
                          {perspective.ratingChange}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canReview ? (
                        <Link
                          href={reviewHref}
                          className="rounded-full border border-[var(--chess-gold)]/35 bg-[var(--chess-gold)]/10 px-3 py-1 text-xs font-bold text-[var(--chess-gold)] transition hover:bg-[var(--chess-gold)]/18"
                        >
                          Analyze
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-[var(--chess-cream-muted)] opacity-40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GameOpponent({
  perspective,
}: {
  perspective: ReturnType<typeof getGamePerspective>;
}) {
  return (
    <div className="flex items-center gap-2">
      <Swords className="h-4 w-4 text-[var(--chess-gold)]" aria-hidden="true" />
      <div>
        <p className="font-black text-[var(--chess-cream)]">{perspective.opponent}</p>
        <p className="text-xs font-semibold">{perspective.color}</p>
      </div>
    </div>
  );
}
