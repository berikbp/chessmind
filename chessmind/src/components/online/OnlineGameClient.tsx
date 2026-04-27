"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import type { Color, Move, PieceSymbol, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard";
import {
  CheckCircle2,
  Clipboard,
  Flag,
  Link2,
  Loader2,
  Plug,
  Radio,
  RotateCcw,
  Shield,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

import { CapturedPieces } from "@/components/board/CapturedPieces";
import { MoveHistory } from "@/components/board/MoveHistory";
import { PlayerInfo } from "@/components/board/PlayerInfo";
import { PromotionDialog } from "@/components/board/PromotionDialog";
import { Timer } from "@/components/board/Timer";
import { buildSquareStyles } from "@/lib/chess/board-styles";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { parseTimeControl } from "@/hooks/useTimer";
import type { CapturedPieces as CapturedPiecesState } from "@/hooks/useChessGame";
import type { Json, OnlineGameRecord, Profile } from "@/types";

type GameResult = "1-0" | "0-1" | "1/2-1/2";
type RealtimeStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

interface OnlinePlayer {
  id: string;
  rating: number;
  username: string;
}

interface OnlineGameClientProps {
  currentUserId: string;
  currentUserProfile: Profile | null;
  initialGame: OnlineGameRecord;
  whiteProfile: OnlinePlayer | null;
  blackProfile: OnlinePlayer | null;
}

interface CompletePayload {
  blackTime: number | null;
  fen: string;
  lastMove: Json | null;
  pgn: string;
  result: GameResult;
  termination: string;
  totalMoves: number;
  turn: Color;
  whiteTime: number | null;
}

interface OnlineGameSnapshot {
  blackProfile: OnlinePlayer | null;
  game: OnlineGameRecord;
  whiteProfile: OnlinePlayer | null;
}

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BOARD_SIZE_STYLE = {
  "--online-board-size": "min(540px, calc(100vw - 48px), calc(100svh - 300px))",
} as CSSProperties;

function buildGameFromPgn(pgn: string, fallbackFen: string) {
  const game = new Chess();
  if (pgn.trim()) {
    try {
      game.loadPgn(pgn);
      return game;
    } catch {
      // Fall back to FEN if a partially written PGN ever reaches the client.
    }
  }

  try {
    return new Chess(fallbackFen || STARTING_FEN);
  } catch {
    return new Chess();
  }
}

function deriveCapturedPieces(history: Move[]): CapturedPiecesState {
  const captured: CapturedPiecesState = { w: [], b: [] };
  for (const move of history) {
    if (move.captured) captured[move.color].push(move.captured);
  }
  return captured;
}

function getPlayerColor(game: OnlineGameRecord, userId: string): Color | null {
  if (game.white_id === userId) return "w";
  if (game.black_id === userId) return "b";
  return null;
}

function getLastMove(lastMove: Json | null) {
  if (!lastMove || typeof lastMove !== "object" || Array.isArray(lastMove)) return null;
  const from = lastMove.from;
  const to = lastMove.to;
  if (typeof from !== "string" || typeof to !== "string") return null;
  return { from: from as Square, to: to as Square };
}

function isPromotionAttempt(game: Chess, from: Square, to: Square) {
  return (game.moves({ square: from, verbose: true }) as Move[]).some(
    (move) => move.to === to && Boolean(move.promotion),
  );
}

function getEndState(game: Chess): { result: GameResult; termination: string } | null {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) {
    return {
      result: game.turn() === "w" ? "0-1" : "1-0",
      termination: "checkmate",
    };
  }
  if (game.isStalemate()) return { result: "1/2-1/2", termination: "stalemate" };
  if (game.isInsufficientMaterial()) {
    return { result: "1/2-1/2", termination: "insufficient material" };
  }
  if (game.isThreefoldRepetition()) {
    return { result: "1/2-1/2", termination: "threefold repetition" };
  }
  return { result: "1/2-1/2", termination: "draw" };
}

function getPlayer(profile: OnlinePlayer | null, color: Color) {
  return profile ?? {
    id: `${color}-waiting`,
    rating: 1200,
    username: color === "w" ? "White player" : "Black player",
  };
}

function getResultText(result: string | null, myColor: Color | null) {
  if (!result || !myColor) return result ?? "Game over";
  if (result === "1/2-1/2") return "Draw";
  const won = (result === "1-0" && myColor === "w") || (result === "0-1" && myColor === "b");
  return won ? "You won" : "You lost";
}

export function OnlineGameClient({
  currentUserId,
  currentUserProfile,
  initialGame,
  whiteProfile,
  blackProfile,
}: OnlineGameClientProps) {
  const [onlineGame, setOnlineGame] = useState(initialGame);
  const [whiteOnlinePlayer, setWhiteOnlinePlayer] = useState(whiteProfile);
  const [blackOnlinePlayer, setBlackOnlinePlayer] = useState(blackProfile);
  const [feedback, setFeedback] = useState("Share the invite link with your friend.");
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [previewFen, setPreviewFen] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCreatingRematch, setIsCreatingRematch] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const parsedTimeControl = useMemo(
    () => parseTimeControl(onlineGame.time_control),
    [onlineGame.time_control],
  );
  const liveGame = useMemo(
    () => buildGameFromPgn(onlineGame.pgn, onlineGame.fen),
    [onlineGame.fen, onlineGame.pgn],
  );
  const displayFen = previewFen ?? onlineGame.fen;
  const displayGame = useMemo(() => {
    try {
      return new Chess(displayFen);
    } catch {
      return new Chess();
    }
  }, [displayFen]);
  const history = useMemo(() => liveGame.history({ verbose: true }), [liveGame]);
  const capturedPieces = useMemo(() => deriveCapturedPieces(history), [history]);
  const myColor = getPlayerColor(onlineGame, currentUserId);
  const bottomColor: Color = myColor ?? "w";
  const topColor: Color = bottomColor === "w" ? "b" : "w";
  const whitePlayer = getPlayer(whiteOnlinePlayer, "w");
  const blackPlayer = getPlayer(blackOnlinePlayer, "b");
  const topPlayer = topColor === "w" ? whitePlayer : blackPlayer;
  const bottomPlayer = bottomColor === "w" ? whitePlayer : blackPlayer;
  const canMove =
    onlineGame.status === "active" &&
    !previewFen &&
    myColor !== null &&
    onlineGame.turn === myColor &&
    !isCompleting;
  const invitePath = `/online/join/${onlineGame.invite_code}`;
  const connectionMeta = {
    connected: {
      icon: <Wifi className="h-4 w-4" aria-hidden="true" />,
      label: "Realtime connected",
      style: "border-[var(--chess-green)]/30 bg-[var(--chess-green)]/10 text-[var(--chess-green)]",
    },
    connecting: {
      icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
      label: "Connecting realtime",
      style: "border-[var(--chess-gold)]/30 bg-[var(--chess-gold)]/10 text-[var(--chess-gold)]",
    },
    disconnected: {
      icon: <WifiOff className="h-4 w-4" aria-hidden="true" />,
      label: "Realtime disconnected",
      style: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    },
    reconnecting: {
      icon: <Plug className="h-4 w-4" aria-hidden="true" />,
      label: "Reconnecting with backup sync",
      style: "border-[var(--chess-gold)]/30 bg-[var(--chess-gold)]/10 text-[var(--chess-gold)]",
    },
  }[realtimeStatus];

  function getDisplaySeconds(color: Color) {
    const base = color === "w" ? onlineGame.white_time : onlineGame.black_time;
    if (!parsedTimeControl.isTimed || base === null) return 0;
    if (onlineGame.status !== "active" || onlineGame.turn !== color || !onlineGame.last_move_at) {
      return Math.max(0, base);
    }

    const now = clockNow > 0 ? clockNow : Date.parse(onlineGame.last_move_at);
    const elapsed = Math.floor((now - Date.parse(onlineGame.last_move_at)) / 1000);
    return Math.max(0, base - elapsed);
  }

  const whiteSeconds = getDisplaySeconds("w");
  const blackSeconds = getDisplaySeconds("b");

  const squareStyles = useMemo(
    () =>
      buildSquareStyles({
        fen: displayFen,
        isCheck: displayGame.inCheck(),
        lastMove: getLastMove(onlineGame.last_move),
        legalMoves: canMove ? legalMoves : [],
        selectedSquare: canMove ? selectedSquare : null,
        turn: displayGame.turn(),
      }),
    [canMove, displayFen, displayGame, legalMoves, onlineGame.last_move, selectedSquare],
  );

  const applyRemoteGame = useCallback((nextGame: OnlineGameRecord) => {
    setOnlineGame(nextGame);
    setPreviewFen(null);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalMoves([]);

    const nextMyColor = getPlayerColor(nextGame, currentUserId);
    if (nextGame.status === "waiting") {
      setFeedback("Share the invite link with your friend.");
    }
    if (nextGame.status === "active") {
      setFeedback(nextGame.turn === nextMyColor ? "Your move." : "Waiting for your friend.");
    }
    if (nextGame.status === "completed") {
      setFeedback(nextGame.termination ?? "Game over.");
    }
  }, [currentUserId]);

  const applySnapshot = useCallback(
    (snapshot: OnlineGameSnapshot) => {
      setWhiteOnlinePlayer(snapshot.whiteProfile);
      setBlackOnlinePlayer(snapshot.blackProfile);
      applyRemoteGame(snapshot.game);
    },
    [applyRemoteGame],
  );

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`/api/online-games/${onlineGame.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const snapshot = (await response.json()) as OnlineGameSnapshot;
      applySnapshot(snapshot);
    } catch {
      // Realtime remains the primary path; polling is only a fallback.
    }
  }, [applySnapshot, onlineGame.id]);

  const completeGame = useCallback(
    async (payload: CompletePayload) => {
      if (isCompleting) return;
      setIsCompleting(true);
      setFeedback("Saving completed online game...");

      try {
        const response = await fetch(`/api/online-games/${onlineGame.id}/complete`, {
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = (await response.json()) as {
          error?: string;
          game?: OnlineGameRecord | null;
          success?: boolean;
        };

        if (!response.ok || !result.success) {
          setFeedback(result.error ?? "Could not save completed game.");
          return;
        }

        if (result.game) setOnlineGame(result.game);
        setFeedback("Game saved. You can review it from this screen or your profile.");
      } catch {
        setFeedback("Network error while saving completed game.");
      } finally {
        setIsCompleting(false);
      }
    },
    [isCompleting, onlineGame.id],
  );

  useEffect(() => {
    const channel = supabase
      .channel(`online-game:${onlineGame.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: `id=eq.${onlineGame.id}`,
          schema: "public",
          table: "online_games",
        },
        (payload) => {
          const nextGame = payload.new as OnlineGameRecord;
          applyRemoteGame(nextGame);
          void refreshSnapshot();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("reconnecting");
          void refreshSnapshot();
          return;
        }
        if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      setRealtimeStatus("disconnected");
      void supabase.removeChannel(channel);
    };
  }, [applyRemoteGame, onlineGame.id, refreshSnapshot, supabase]);

  useEffect(() => {
    if (onlineGame.status === "completed") return;

    const interval = window.setInterval(() => {
      void refreshSnapshot();
    }, onlineGame.status === "waiting" ? 1500 : 3000);

    return () => window.clearInterval(interval);
  }, [onlineGame.status, refreshSnapshot]);

  useEffect(() => {
    if (!parsedTimeControl.isTimed || onlineGame.status !== "active") return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [onlineGame.status, parsedTimeControl.isTimed]);

  useEffect(() => {
    if (!parsedTimeControl.isTimed || onlineGame.status !== "active" || isCompleting) return;
    const activeColor = onlineGame.turn as Color;
    const activeSeconds = activeColor === "w" ? whiteSeconds : blackSeconds;
    if (activeSeconds > 0) {
      const timeoutId = window.setTimeout(() => setClockNow(Date.now()), activeSeconds * 1000);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      const result: GameResult = activeColor === "w" ? "0-1" : "1-0";
      void completeGame({
        blackTime: blackSeconds,
        fen: onlineGame.fen,
        lastMove: onlineGame.last_move,
        pgn: onlineGame.pgn,
        result,
        termination: "timeout",
        totalMoves: history.length,
        turn: activeColor,
        whiteTime: whiteSeconds,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    blackSeconds,
    completeGame,
    history.length,
    isCompleting,
    onlineGame,
    parsedTimeControl.isTimed,
    whiteSeconds,
  ]);

  function selectSquare(square: Square) {
    const moves = liveGame.moves({ square, verbose: true }) as Move[];
    setSelectedSquare(square);
    setLegalMoves(moves);
    setPendingPromotion(null);
  }

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}${invitePath}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyNotice("Invite copied.");
    } catch {
      setCopyNotice(inviteUrl);
    }
  }

  async function attemptMove(sourceSquare: Square, targetSquare: Square, promotion?: PieceSymbol) {
    if (!canMove || !myColor) return false;

    const moveGame = buildGameFromPgn(onlineGame.pgn, onlineGame.fen);
    const sourceMoves = moveGame.moves({ square: sourceSquare, verbose: true }) as Move[];
    const needsPromotion = sourceMoves.some((move) => move.to === targetSquare && Boolean(move.promotion));

    if (needsPromotion && !promotion) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      setSelectedSquare(null);
      setLegalMoves([]);
      setFeedback("Choose the promotion piece.");
      return false;
    }

    let move: Move | null = null;
    try {
      move = moveGame.move({ from: sourceSquare, promotion, to: targetSquare });
    } catch {
      move = null;
    }

    if (!move) {
      setFeedback("That move is not legal.");
      return false;
    }

    const movingTime = myColor === "w" ? whiteSeconds : blackSeconds;
    const nextWhiteTime =
      myColor === "w" && parsedTimeControl.isTimed
        ? movingTime + parsedTimeControl.incrementSeconds
        : onlineGame.white_time;
    const nextBlackTime =
      myColor === "b" && parsedTimeControl.isTimed
        ? movingTime + parsedTimeControl.incrementSeconds
        : onlineGame.black_time;
    const lastMove = {
      at: new Date().toISOString(),
      color: move.color,
      from: move.from,
      san: move.san,
      to: move.to,
    } satisfies Json;
    const endState = getEndState(moveGame);

    setSelectedSquare(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    setFeedback(endState ? "Game over. Saving result..." : "Move sent.");

    if (endState) {
      await completeGame({
        blackTime: nextBlackTime,
        fen: moveGame.fen(),
        lastMove,
        pgn: moveGame.pgn(),
        result: endState.result,
        termination: endState.termination,
        totalMoves: moveGame.history().length,
        turn: moveGame.turn(),
        whiteTime: nextWhiteTime,
      });
      return true;
    }

    const { data, error } = await supabase
      .from("online_games")
      .update({
        black_time: nextBlackTime,
        fen: moveGame.fen(),
        last_move: lastMove,
        last_move_at: new Date().toISOString(),
        pgn: moveGame.pgn(),
        turn: moveGame.turn(),
        version: onlineGame.version + 1,
        white_time: nextWhiteTime,
      })
      .eq("id", onlineGame.id)
      .eq("fen", onlineGame.fen)
      .eq("turn", myColor)
      .select("*")
      .single();

    if (error || !data) {
      setFeedback("Move was rejected because the position changed. Syncing...");
      return false;
    }

    setOnlineGame(data as OnlineGameRecord);
    return true;
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (!canMove) return;

    const clickedSquare = square as Square;
    const clickedPiece = liveGame.get(clickedSquare);

    if (selectedSquare) {
      const isLegalTarget = legalMoves.some((move) => move.to === clickedSquare);
      if (isLegalTarget) {
        if (isPromotionAttempt(liveGame, selectedSquare, clickedSquare)) {
          setPendingPromotion({ from: selectedSquare, to: clickedSquare });
          setSelectedSquare(null);
          setLegalMoves([]);
          setFeedback("Choose the promotion piece.");
          return;
        }

        void attemptMove(selectedSquare, clickedSquare);
        return;
      }

      if (clickedPiece?.color === liveGame.turn()) {
        selectSquare(clickedSquare);
        return;
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (clickedPiece?.color === liveGame.turn() && clickedPiece.color === myColor) {
      selectSquare(clickedSquare);
    }
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!targetSquare || !canMove) return false;
    const from = sourceSquare as Square;
    const to = targetSquare as Square;

    if (isPromotionAttempt(liveGame, from, to)) {
      setPendingPromotion({ from, to });
      setSelectedSquare(null);
      setLegalMoves([]);
      setFeedback("Choose the promotion piece.");
      return false;
    }

    const isLegal = (liveGame.moves({ square: from, verbose: true }) as Move[]).some(
      (move) => move.to === to,
    );
    if (!isLegal) return false;

    void attemptMove(from, to);
    return true;
  }

  function handlePromotionSelect(piece: PieceSymbol) {
    if (!pendingPromotion) return;
    void attemptMove(pendingPromotion.from, pendingPromotion.to, piece);
  }

  function handlePromotionCancel() {
    setPendingPromotion(null);
    setFeedback("Promotion cancelled.");
  }

  function resign() {
    if (!myColor || onlineGame.status !== "active") return;
    const result: GameResult = myColor === "w" ? "0-1" : "1-0";
    void completeGame({
      blackTime: blackSeconds,
      fen: onlineGame.fen,
      lastMove: onlineGame.last_move,
      pgn: onlineGame.pgn,
      result,
      termination: "resignation",
      totalMoves: history.length,
      turn: onlineGame.turn as Color,
      whiteTime: whiteSeconds,
    });
  }

  async function createRematch() {
    if (!myColor || isCreatingRematch) return;

    setIsCreatingRematch(true);
    setFeedback("Creating rematch invite...");

    try {
      const response = await fetch("/api/online-games", {
        body: JSON.stringify({
          hostColor: myColor === "w" ? "b" : "w",
          timeControl: onlineGame.time_control,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; game?: { id: string } };

      if (!response.ok || !result.game?.id) {
        setFeedback(result.error ?? "Could not create rematch.");
        return;
      }

      window.location.href = `/online/${result.game.id}`;
    } catch {
      setFeedback("Could not reach the online game server.");
    } finally {
      setIsCreatingRematch(false);
    }
  }

  const whiteTimer = (
    <Timer
      seconds={whiteSeconds}
      isActive={onlineGame.status === "active" && onlineGame.turn === "w"}
      isTimed={parsedTimeControl.isTimed}
      label={parsedTimeControl.label}
    />
  );
  const blackTimer = (
    <Timer
      seconds={blackSeconds}
      isActive={onlineGame.status === "active" && onlineGame.turn === "b"}
      isTimed={parsedTimeControl.isTimed}
      label={parsedTimeControl.label}
    />
  );

  return (
    <main
      className="mx-auto grid w-full max-w-6xl items-start gap-4 pb-4 lg:grid-cols-[556px_minmax(0,420px)] lg:justify-center lg:gap-6 lg:pb-0"
      style={BOARD_SIZE_STYLE}
    >
      <section
        className="card-surface mx-auto flex w-full max-w-[556px] flex-col gap-1 rounded-[1.5rem] p-2 lg:mx-0"
        style={{ width: "calc(var(--online-board-size) + 16px)" }}
      >
        <PlayerInfo
          username={topPlayer.username}
          rating={topPlayer.rating}
          isCurrentTurn={onlineGame.status === "active" && onlineGame.turn === topColor}
          timer={topColor === "w" ? whiteTimer : blackTimer}
        />
        <CapturedPieces pieces={capturedPieces[bottomColor]} pieceColor={topColor} />

        <div
          className="relative overflow-hidden rounded-[1.25rem] border border-[var(--chess-border)] shadow-[0_22px_60px_rgba(0,0,0,0.38)]"
          style={{ width: "var(--online-board-size)", height: "var(--online-board-size)" }}
        >
          <Chessboard
            options={{
              allowDrawingArrows: false,
              animationDurationInMs: 140,
              boardOrientation: bottomColor === "b" ? "black" : "white",
              boardStyle: { borderRadius: "20px" },
              darkSquareStyle: { backgroundColor: "#7a4f28" },
              lightSquareStyle: { backgroundColor: "#ead7b4" },
              onPieceDrop: handlePieceDrop,
              onSquareClick: handleSquareClick,
              position: displayFen,
              squareStyles,
            }}
          />

          {pendingPromotion && myColor ? (
            <PromotionDialog
              color={myColor}
              onCancel={handlePromotionCancel}
              onSelect={handlePromotionSelect}
            />
          ) : null}

          {onlineGame.status === "waiting" ? (
            <BoardNotice
              icon={<Users className="h-5 w-5" aria-hidden="true" />}
              title="Waiting for your friend"
              text="Send the invite link. The board unlocks when the second player joins."
            />
          ) : null}

          {previewFen ? (
            <div className="absolute bottom-3 left-3 right-3 z-[6] rounded-2xl border border-[var(--chess-gold)]/30 bg-[#211a11]/92 p-3 text-sm font-bold text-[var(--chess-cream)] shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <span>Viewing move history</span>
                <button
                  type="button"
                  onClick={() => setPreviewFen(null)}
                  className="focus-ring rounded-xl border border-[var(--chess-border)] px-3 py-1 text-xs text-[var(--chess-cream-muted)] transition hover:bg-white/[0.08] hover:text-[var(--chess-cream)]"
                >
                  Return live
                </button>
              </div>
            </div>
          ) : null}

          {onlineGame.status === "completed" ? (
            <BoardNotice
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              title={getResultText(onlineGame.result, myColor)}
              text={onlineGame.termination ?? "Game over"}
            />
          ) : null}
        </div>

        <CapturedPieces pieces={capturedPieces[topColor]} pieceColor={bottomColor} />
        <PlayerInfo
          username={bottomPlayer.username}
          rating={bottomPlayer.rating}
          isCurrentTurn={onlineGame.status === "active" && onlineGame.turn === bottomColor}
          timer={bottomColor === "w" ? whiteTimer : blackTimer}
        />
      </section>

      <aside className="card-surface w-full min-w-0 overflow-hidden rounded-[1.5rem] lg:max-h-[calc(100svh-112px)] lg:rounded-[2rem]">
        <div className="flex flex-col gap-4 p-4">
          <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--chess-green)]">
                  Online friend match
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold text-[var(--chess-cream)]">
                  {onlineGame.status === "waiting"
                    ? "Invite a friend"
                    : onlineGame.status === "completed"
                      ? "Game complete"
                      : onlineGame.turn === myColor
                        ? "Your move"
                        : "Friend's move"}
                </h1>
              </div>
              <Radio className="h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--chess-cream-muted)]">{feedback}</p>
            <p className="mt-3 rounded-xl border border-[var(--chess-border)] bg-black/14 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--chess-cream-muted)]">
              Clock: {parsedTimeControl.label}
            </p>
            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${connectionMeta.style}`}
            >
              {connectionMeta.icon}
              {connectionMeta.label}
            </div>
          </div>

          {onlineGame.status === "waiting" ? (
            <div className="rounded-[1.5rem] border border-[var(--chess-gold)]/25 bg-[var(--chess-gold)]/10 p-4">
              <div className="flex items-start gap-3">
                <Link2 className="mt-0.5 h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
                <div>
                  <p className="font-bold text-[var(--chess-cream)]">Invite link</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--chess-cream-muted)]">
                    Your friend must open this link while signed in.
                  </p>
                </div>
              </div>
              <input
                readOnly
                value={invitePath}
                className="mt-4 w-full rounded-2xl border border-[var(--chess-border)] bg-[#141009]/80 px-3 py-3 text-xs font-bold text-[var(--chess-cream)] outline-none"
              />
              <button
                type="button"
                onClick={() => void copyInvite()}
                className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--chess-gold)] px-4 py-2 text-sm font-black text-[#141009] transition hover:brightness-110 active:scale-[0.98]"
              >
                <Clipboard className="h-4 w-4" aria-hidden="true" />
                Copy invite
              </button>
              {copyNotice ? (
                <p className="mt-2 text-xs font-bold text-[var(--chess-green)]">{copyNotice}</p>
              ) : null}
            </div>
          ) : null}

          <MoveHistory history={history} onSelectMove={setPreviewFen} />

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/lobby"
              className="focus-ring flex min-h-12 items-center justify-center rounded-2xl border border-[var(--chess-border)] bg-white/[0.055] px-3 py-2 text-sm font-bold text-[var(--chess-cream)] transition hover:bg-white/[0.09]"
            >
              Lobby
            </Link>
            {onlineGame.status === "completed" && onlineGame.saved_game_id ? (
              <>
                <Link
                  href={`/game/review/${onlineGame.saved_game_id}`}
                  className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-green)] px-3 py-2 text-sm font-black text-[#141009] transition hover:bg-[#8fbd4a]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Review
                </Link>
                <button
                  type="button"
                  onClick={() => void createRematch()}
                  disabled={isCreatingRematch || !myColor}
                  className="focus-ring col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--chess-gold)] px-3 py-2 text-sm font-black text-[#141009] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingRematch ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Users className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isCreatingRematch ? "Creating rematch..." : "Create rematch invite"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={resign}
                disabled={onlineGame.status !== "active" || !myColor || isCompleting}
                className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200 transition hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCompleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Flag className="h-4 w-4" aria-hidden="true" />
                )}
                Resign
              </button>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-[var(--chess-border)] bg-black/18 p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-[var(--chess-green)]" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-[var(--chess-cream)]">
                  {currentUserProfile?.username ?? "You"} are playing as{" "}
                  {myColor === "w" ? "White" : myColor === "b" ? "Black" : "Spectator"}.
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--chess-cream-muted)]">
                  Moves sync through Supabase Realtime. If a move is rejected, the board will resync
                  to the latest saved position.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

function BoardNotice({
  icon,
  text,
  title,
}: {
  icon: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center bg-[#141009]/72 px-5 text-center backdrop-blur-[3px]">
      <div className="max-w-sm rounded-[1.5rem] border border-[var(--chess-border)] bg-[#211a11]/92 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.5)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--chess-gold)]/16 text-[var(--chess-gold)]">
          {icon}
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold text-[var(--chess-cream)]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--chess-cream-muted)]">{text}</p>
      </div>
    </div>
  );
}
