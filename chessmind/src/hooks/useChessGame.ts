"use client";

import { useCallback, useState } from "react";
import { Chess } from "chess.js";
import type { Color, Move, PieceSymbol, Square } from "chess.js";

export type GameResult = "1-0" | "0-1" | "1/2-1/2";

export interface CapturedPieces {
  /** Pieces captured by white (i.e. black pieces removed from the board) */
  w: PieceSymbol[];
  /** Pieces captured by black (i.e. white pieces removed from the board) */
  b: PieceSymbol[];
}

export interface PendingPromotion {
  from: Square;
  to: Square;
}

export interface ChessGameState {
  fen: string;
  pgn: string;
  turn: Color;
  selectedSquare: Square | null;
  legalMoves: Move[];
  moveHistory: Move[];
  capturedPieces: CapturedPieces;
  isCheck: boolean;
  isGameOver: boolean;
  result: GameResult | null;
  termination: string | null;
  lastMove: { from: Square; to: Square } | null;
  pendingPromotion: PendingPromotion | null;
}

// ---------------------------------------------------------------------------
// Pure derivation helpers (no React dependencies)
// ---------------------------------------------------------------------------

function deriveCapturedPieces(history: Move[]): CapturedPieces {
  const captured: CapturedPieces = { w: [], b: [] };
  for (const move of history) {
    if (move.captured) {
      captured[move.color].push(move.captured);
    }
  }
  return captured;
}

function deriveGameOverState(game: Chess): {
  isGameOver: boolean;
  result: GameResult | null;
  termination: string | null;
} {
  if (!game.isGameOver()) {
    return { isGameOver: false, result: null, termination: null };
  }

  if (game.isCheckmate()) {
    return {
      isGameOver: true,
      result: game.turn() === "w" ? "0-1" : "1-0",
      termination: "checkmate",
    };
  }

  if (game.isStalemate()) {
    return { isGameOver: true, result: "1/2-1/2", termination: "stalemate" };
  }

  if (game.isInsufficientMaterial()) {
    return {
      isGameOver: true,
      result: "1/2-1/2",
      termination: "insufficient material",
    };
  }

  if (game.isThreefoldRepetition()) {
    return {
      isGameOver: true,
      result: "1/2-1/2",
      termination: "threefold repetition",
    };
  }

  return { isGameOver: true, result: "1/2-1/2", termination: "fifty-move rule" };
}

type CoreState = Omit<ChessGameState, "selectedSquare" | "legalMoves" | "pendingPromotion">;

function deriveCoreState(game: Chess): CoreState {
  const history = game.history({ verbose: true });
  const lastRawMove = history.at(-1);

  return {
    fen: game.fen(),
    pgn: game.pgn(),
    turn: game.turn(),
    moveHistory: history,
    capturedPieces: deriveCapturedPieces(history),
    isCheck: game.isCheck(),
    lastMove: lastRawMove ? { from: lastRawMove.from, to: lastRawMove.to } : null,
    ...deriveGameOverState(game),
  };
}

function isPromotionMove(game: Chess, from: Square, to: Square): boolean {
  return game
    .moves({ verbose: true })
    .some((m) => m.from === from && m.to === to && m.promotion !== undefined);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChessGame(initialFen?: string) {
  const [game] = useState(() => new Chess(initialFen));

  const [state, setState] = useState<ChessGameState>(() => ({
    ...deriveCoreState(new Chess(initialFen)),
    selectedSquare: null,
    legalMoves: [],
    pendingPromotion: null,
  }));

  // Core move execution — mutates the chess instance then syncs state.
  const executeMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
      if (from === to) return false;

      let result;
      try {
        result = game.move({ from, to, promotion });
      } catch {
        return false;
      }

      if (!result) return false;

      setState({
        ...deriveCoreState(game),
        selectedSquare: null,
        legalMoves: [],
        pendingPromotion: null,
      });
      return true;
    },
    [game],
  );

  // Click-to-move handler:
  //   1. Nothing selected  → select clicked friendly piece
  //   2. Piece selected, click legal target → move (or open promotion dialog)
  //   3. Piece selected, click same square → deselect
  //   4. Piece selected, click another friendly piece → re-select
  //   5. Piece selected, click invalid target → deselect
  const handleSquareClick = useCallback(
    (square: Square) => {
      if (state.isGameOver || state.pendingPromotion) return;

      const { selectedSquare, legalMoves } = state;

      if (selectedSquare) {
        // Clicked a legal destination
        if (legalMoves.some((m) => m.to === square)) {
          if (isPromotionMove(game, selectedSquare, square)) {
            setState((prev) => ({
              ...prev,
              pendingPromotion: { from: selectedSquare, to: square },
            }));
            return;
          }
          executeMove(selectedSquare, square);
          return;
        }

        // Deselect by clicking the same square
        if (square === selectedSquare) {
          setState((prev) => ({ ...prev, selectedSquare: null, legalMoves: [] }));
          return;
        }

        // Re-select a different friendly piece
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setState((prev) => ({
            ...prev,
            selectedSquare: square,
            legalMoves: game.moves({ square, verbose: true }),
          }));
          return;
        }

        // Clicked empty square or opponent piece — deselect
        setState((prev) => ({ ...prev, selectedSquare: null, legalMoves: [] }));
        return;
      }

      // Nothing was selected: try to select a friendly piece
      const piece = game.get(square);
      if (!piece || piece.color !== game.turn()) return;

      setState((prev) => ({
        ...prev,
        selectedSquare: square,
        legalMoves: game.moves({ square, verbose: true }),
      }));
    },
    [game, state, executeMove],
  );

  // Drag-and-drop handler (return value drives react-chessboard snap-back).
  // Returns false for promotion moves so the board snaps back while the
  // promotion dialog is shown; the actual move fires via confirmPromotion.
  const handlePieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      if (state.isGameOver) return false;
      if (sourceSquare === targetSquare) return false;

      if (isPromotionMove(game, sourceSquare, targetSquare)) {
        setState((prev) => ({
          ...prev,
          selectedSquare: null,
          legalMoves: [],
          pendingPromotion: { from: sourceSquare, to: targetSquare },
        }));
        return false;
      }

      return executeMove(sourceSquare, targetSquare);
    },
    [game, state.isGameOver, executeMove],
  );

  const confirmPromotion = useCallback(
    (piece: PieceSymbol) => {
      if (!state.pendingPromotion) return;
      const { from, to } = state.pendingPromotion;
      executeMove(from, to, piece);
    },
    [state.pendingPromotion, executeMove],
  );

  const cancelPromotion = useCallback(() => {
    setState((prev) => ({ ...prev, pendingPromotion: null }));
  }, []);

  const undoMove = useCallback(() => {
    game.undo();
    setState({
      ...deriveCoreState(game),
      selectedSquare: null,
      legalMoves: [],
      pendingPromotion: null,
    });
  }, [game]);

  const resetGame = useCallback(() => {
    game.reset();
    setState({
      ...deriveCoreState(game),
      selectedSquare: null,
      legalMoves: [],
      pendingPromotion: null,
    });
  }, [game]);

  // Loads an arbitrary FEN — used for move-history replay and coach card jump.
  // The live game state reflects the loaded position; history is lost.
  const loadPosition = useCallback((fen: string) => {
    game.load(fen);
    setState({
      ...deriveCoreState(game),
      selectedSquare: null,
      legalMoves: [],
      pendingPromotion: null,
    });
  }, [game]);

  // Resign: sets game over without a chess.js move — used by the UI resign button.
  const resign = useCallback((resigningColor: Color) => {
    setState((prev) => ({
      ...prev,
      isGameOver: true,
      result: resigningColor === "w" ? "0-1" : "1-0",
      termination: "resignation",
      selectedSquare: null,
      legalMoves: [],
    }));
  }, []);

  const timeout = useCallback((timedOutColor: Color) => {
    setState((prev) => ({
      ...prev,
      isGameOver: true,
      result: timedOutColor === "w" ? "0-1" : "1-0",
      termination: "timeout",
      selectedSquare: null,
      legalMoves: [],
      pendingPromotion: null,
    }));
  }, []);

  return {
    ...state,
    executeMove,
    handleSquareClick,
    handlePieceDrop,
    confirmPromotion,
    cancelPromotion,
    undoMove,
    resetGame,
    loadPosition,
    resign,
    timeout,
  };
}
