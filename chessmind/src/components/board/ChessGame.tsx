"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { GameResult } from "@/hooks/useChessGame";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import type { Color, Square } from "chess.js";

import { useChessGame } from "@/hooks/useChessGame";
import { useStockfish } from "@/hooks/useStockfish";
import { parseTimeControl, useTimer } from "@/hooks/useTimer";
import { buildSquareStyles } from "@/lib/chess/board-styles";
import { getBestMoveMinmax } from "@/lib/chess/minimax";
import { PlayerInfo } from "./PlayerInfo";
import { CapturedPieces } from "./CapturedPieces";
import { MoveHistory } from "./MoveHistory";
import { PromotionDialog } from "./PromotionDialog";
import { GameOverOverlay } from "./GameOverOverlay";
import { Timer } from "./Timer";

const OPPONENT_NAMES: Record<string, string> = {
  easy: "ChessMind Easy",
  medium: "ChessMind Medium",
  hard: "ChessMind Hard",
};
const OPPONENT_RATINGS: Record<string, number> = {
  easy: 1000,
  medium: 1400,
  hard: 1800,
};
const BOARD_SIZE_STYLE = {
  "--board-size": "min(540px, calc(100vw - 48px), calc(100svh - 300px))",
} as CSSProperties;

interface ChessGameProps {
  playerColor?: Color;
  playerName?: string;
  playerRating?: number;
  gameMode?: "ai" | "friend";
  difficulty?: "easy" | "medium" | "hard";
  timeControl?: string;
}

export function ChessGame({
  playerColor = "w",
  playerName = "You",
  playerRating = 1200,
  gameMode = "ai",
  difficulty = "medium",
  timeControl = "untimed",
}: ChessGameProps) {
  const game = useChessGame();
  const easyThinkingRef = useRef(false);
  const sfPendingRef = useRef(false);
  const gameSavedRef = useRef(false);
  const isGameOverRef = useRef(false);
  const previousMoveCountRef = useRef(0);
  const [ratingChange, setRatingChange] = useState<number | null>(null);
  const [reviewGameId, setReviewGameId] = useState<string | null>(null);
  const [savingGame, setSavingGame] = useState(false);
  const parsedTimeControl = useMemo(() => parseTimeControl(timeControl), [timeControl]);
  const {
    activeColor,
    blackTime,
    resetTimer,
    switchTurn,
    syncActiveColor,
    whiteTime,
  } = useTimer({
    enabled: parsedTimeControl.isTimed,
    initialSeconds: parsedTimeControl.initialSeconds,
    incrementSeconds: parsedTimeControl.incrementSeconds,
    initialActiveColor: "w",
    isGameOver: game.isGameOver,
    onTimeout: game.timeout,
  });

  const sfDifficulty = difficulty === "hard" ? "hard" : "medium";
  const { getBestMove: sfGetBestMove } = useStockfish({
    difficulty: sfDifficulty,
    enabled: gameMode === "ai" && difficulty !== "easy",
  });

  useEffect(() => {
    isGameOverRef.current = game.isGameOver;
  }, [game.isGameOver]);

  useEffect(() => {
    const previousMoveCount = previousMoveCountRef.current;
    const currentMoveCount = game.moveHistory.length;

    if (currentMoveCount === 0) {
      syncActiveColor("w");
      previousMoveCountRef.current = 0;
      return;
    }

    if (currentMoveCount > previousMoveCount) {
      switchTurn(game.turn);
    } else if (currentMoveCount < previousMoveCount) {
      syncActiveColor(game.turn);
    }

    previousMoveCountRef.current = currentMoveCount;
  }, [game.moveHistory.length, game.turn, switchTurn, syncActiveColor]);

  // Easy AI: minimax depth-2 with 300ms delay
  useEffect(() => {
    if (
      gameMode !== "ai" ||
      difficulty !== "easy" ||
      game.isGameOver ||
      game.turn === playerColor ||
      easyThinkingRef.current
    ) return;

    easyThinkingRef.current = true;
    setTimeout(() => {
      if (isGameOverRef.current) {
        easyThinkingRef.current = false;
        return;
      }

      const snapshot = new Chess(game.fen);
      const best = getBestMoveMinmax(snapshot, 2);
      if (best) {
        const parsed = snapshot.move(best);
        if (parsed) game.handlePieceDrop(parsed.from as Square, parsed.to as Square);
      }
      easyThinkingRef.current = false;
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen, game.isGameOver]);

  // Medium / Hard AI: Stockfish WASM via Web Worker
  useEffect(() => {
    if (
      gameMode !== "ai" ||
      difficulty === "easy" ||
      game.isGameOver ||
      game.turn === playerColor ||
      sfPendingRef.current
    ) return;

    sfPendingRef.current = true;
    sfGetBestMove(game.fen).then((uciMove) => {
      sfPendingRef.current = false;
      if (isGameOverRef.current) return;
      if (!uciMove) return;
      const from = uciMove.slice(0, 2) as Square;
      const to = uciMove.slice(2, 4) as Square;
      const promotion = uciMove[4] as "q" | "r" | "b" | "n" | undefined;
      game.executeMove(from, to, promotion);
    });
  // sfGetBestMove reference changes when engine becomes ready — re-check then
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen, game.isGameOver, sfGetBestMove]);

  // Save game and update ELO when the game ends (AI mode only)
  useEffect(() => {
    if (!game.isGameOver || !game.result || gameSavedRef.current || gameMode !== "ai") return;
    gameSavedRef.current = true;
    setSavingGame(true);

    fetch("/api/game/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pgn: game.pgn,
        result: game.result as GameResult,
        termination: game.termination ?? "unknown",
        totalMoves: game.moveHistory.length,
        playerColor,
        difficulty,
        gameMode,
      }),
    })
      .then((r) => r.json())
      .then((data: { ratingChange?: number; gameId?: string | null }) => {
        if (data.ratingChange !== undefined) setRatingChange(data.ratingChange);
        if (data.gameId) setReviewGameId(data.gameId);
      })
      .catch(() => {})
      .finally(() => setSavingGame(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.isGameOver, game.result]);

  const handlePlayAgain = useCallback(() => {
    game.resetGame();
    resetTimer("w");
    previousMoveCountRef.current = 0;
    setRatingChange(null);
    setReviewGameId(null);
    gameSavedRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.resetGame, resetTimer]);

  const handleNewGame = useCallback(() => {
    game.resetGame();
    resetTimer("w");
    previousMoveCountRef.current = 0;
    setRatingChange(null);
    setReviewGameId(null);
    gameSavedRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.resetGame, resetTimer]);

  const squareStyles = useMemo(
    () =>
      buildSquareStyles({
        fen: game.fen,
        selectedSquare: game.selectedSquare,
        legalMoves: game.legalMoves,
        lastMove: game.lastMove,
        isCheck: game.isCheck,
        turn: game.turn,
      }),
    [game.fen, game.selectedSquare, game.legalMoves, game.lastMove, game.isCheck, game.turn],
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      game.handleSquareClick(square as Square);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.handleSquareClick],
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false;
      return game.handlePieceDrop(sourceSquare as Square, targetSquare as Square);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.handlePieceDrop],
  );

  // In AI mode undo 2 moves (player's + AI's) so the player gets their turn back.
  // If fewer than 2 moves have been made, fall back to a single undo.
  const handleUndo = useCallback(() => {
    if (gameMode === "ai" && game.moveHistory.length >= 2) {
      game.undoMove();
      game.undoMove();
    } else {
      game.undoMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, game.undoMove, game.moveHistory.length]);

  const opponentColor: Color = playerColor === "w" ? "b" : "w";
  const opponentName = gameMode === "ai" ? (OPPONENT_NAMES[difficulty] ?? "ChessMind") : "Player 2";
  const opponentRating = gameMode === "ai" ? (OPPONENT_RATINGS[difficulty] ?? 1400) : 1200;
  const whiteTimer = (
    <Timer
      seconds={whiteTime}
      isActive={activeColor === "w" && !game.isGameOver}
      isTimed={parsedTimeControl.isTimed}
      label={parsedTimeControl.label}
    />
  );
  const blackTimer = (
    <Timer
      seconds={blackTime}
      isActive={activeColor === "b" && !game.isGameOver}
      isTimed={parsedTimeControl.isTimed}
      label={parsedTimeControl.label}
    />
  );

  function renderSidebarContent() {
    return (
      <>
        <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--chess-green)]">
            Current game
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-[var(--chess-cream)]">
            {gameMode === "ai" ? `${difficulty[0].toUpperCase()}${difficulty.slice(1)} AI` : "Pass-and-play"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">
            {game.isGameOver
              ? game.termination ?? "Game over"
              : game.turn === playerColor
                ? "Your move. Look for checks, captures, and threats."
                : "Opponent is thinking."}
          </p>
          <p className="mt-3 rounded-xl border border-[var(--chess-border)] bg-black/14 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
            Clock: {parsedTimeControl.label}
          </p>
        </div>

        <MoveHistory history={game.moveHistory} onSelectMove={game.loadPosition} />

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleUndo}
            disabled={game.moveHistory.length === 0 || game.isGameOver}
            className="focus-ring rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-2 py-3 text-sm font-bold text-[var(--chess-cream)] transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>
          <button
            onClick={handleNewGame}
            className="focus-ring rounded-2xl border border-[var(--chess-green)]/35 bg-[var(--chess-green)]/12 px-2 py-3 text-sm font-bold text-[var(--chess-green)] transition hover:bg-[var(--chess-green)]/18"
          >
            New Game
          </button>
          <button
            onClick={() => game.resign(playerColor)}
            disabled={game.isGameOver}
            className="focus-ring rounded-2xl border border-red-500/25 bg-red-500/10 px-2 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Resign
          </button>
        </div>
      </>
    );
  }

  return (
    <div
      className="mx-auto grid w-full max-w-6xl items-start gap-4 pb-4 lg:grid-cols-[556px_minmax(0,420px)] lg:justify-center lg:gap-6 lg:pb-0"
      style={BOARD_SIZE_STYLE}
    >
      {/* Board column */}
      <div
        className="card-surface mx-auto flex w-full max-w-[556px] flex-col gap-1 rounded-[1.5rem] p-2 lg:mx-0"
        style={{ width: "calc(var(--board-size) + 16px)" }}
      >
        <PlayerInfo
          username={opponentName}
          rating={opponentRating}
          isCurrentTurn={game.turn === opponentColor && !game.isGameOver}
          timer={opponentColor === "w" ? whiteTimer : blackTimer}
        />
        <CapturedPieces pieces={game.capturedPieces[playerColor]} pieceColor={opponentColor} />

        <div
          className="relative overflow-hidden rounded-[1.25rem] border border-[var(--chess-border)] shadow-[0_22px_60px_rgba(0,0,0,0.38)]"
          style={{ width: "var(--board-size)", height: "var(--board-size)" }}
        >
          <Chessboard
            options={{
              position: game.fen,
              boardOrientation: playerColor === "w" ? "white" : "black",
              squareStyles,
              onSquareClick: handleSquareClick,
              onPieceDrop: handlePieceDrop,
              boardStyle: {
                borderRadius: "20px",
              },
              darkSquareStyle: { backgroundColor: "#7a4f28" },
              lightSquareStyle: { backgroundColor: "#ead7b4" },
              animationDurationInMs: 150,
              allowDrawingArrows: false,
            }}
          />
          {game.pendingPromotion && (
            <PromotionDialog
              color={game.turn}
              onSelect={game.confirmPromotion}
              onCancel={game.cancelPromotion}
            />
          )}
          {game.isGameOver && game.result && (
            <GameOverOverlay
              result={game.result}
              termination={game.termination ?? "game over"}
              playerColor={playerColor}
              onPlayAgain={handlePlayAgain}
              ratingChange={ratingChange}
              reviewGameId={gameMode === "ai" ? reviewGameId : null}
              saving={savingGame}
            />
          )}
        </div>

        <CapturedPieces pieces={game.capturedPieces[opponentColor]} pieceColor={playerColor} />
        <PlayerInfo
          username={playerName}
          rating={playerRating}
          isCurrentTurn={game.turn === playerColor && !game.isGameOver}
          timer={playerColor === "w" ? whiteTimer : blackTimer}
        />
      </div>

      {/* Sidebar */}
      <aside className="card-surface w-full min-w-0 overflow-hidden rounded-[1.5rem] lg:max-h-[calc(100svh-112px)] lg:rounded-[2rem]">
        <details className="group lg:hidden" open>
          <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.22em] text-[var(--chess-green)]">
                Game panel
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-[var(--chess-cream-muted)]">
                Moves, clock, and actions
              </span>
            </span>
            <span className="rounded-full border border-[var(--chess-border)] px-3 py-1 text-xs font-bold text-[var(--chess-cream-muted)] group-open:hidden">
              Show
            </span>
            <span className="hidden rounded-full border border-[var(--chess-border)] px-3 py-1 text-xs font-bold text-[var(--chess-cream-muted)] group-open:inline-flex">
              Hide
            </span>
          </summary>
          <div className="flex max-h-[60svh] flex-col gap-3 overflow-y-auto border-t border-[var(--chess-border)] p-3">
            {renderSidebarContent()}
          </div>
        </details>

        <div className="hidden flex-col gap-4 p-4 lg:flex">
          {renderSidebarContent()}
        </div>
      </aside>
    </div>
  );
}
