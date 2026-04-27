export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      daily_usage: {
        Row: {
          coach_review_uses: number;
          created_at: string;
          puzzle_uses: number;
          updated_at: string;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          coach_review_uses?: number;
          created_at?: string;
          puzzle_uses?: number;
          updated_at?: string;
          usage_date?: string;
          user_id: string;
        };
        Update: {
          coach_review_uses?: number;
          created_at?: string;
          puzzle_uses?: number;
          updated_at?: string;
          usage_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          black_id: string | null;
          black_rating_after: number | null;
          black_rating_before: number | null;
          id: string;
          mode: string;
          pgn: string | null;
          played_at: string;
          result: string | null;
          termination: string | null;
          total_moves: number | null;
          white_id: string | null;
          white_rating_after: number | null;
          white_rating_before: number | null;
        };
        Insert: {
          black_id?: string | null;
          black_rating_after?: number | null;
          black_rating_before?: number | null;
          id?: string;
          mode: string;
          pgn?: string | null;
          played_at?: string;
          result?: string | null;
          termination?: string | null;
          total_moves?: number | null;
          white_id?: string | null;
          white_rating_after?: number | null;
          white_rating_before?: number | null;
        };
        Update: {
          black_id?: string | null;
          black_rating_after?: number | null;
          black_rating_before?: number | null;
          id?: string;
          mode?: string;
          pgn?: string | null;
          played_at?: string;
          result?: string | null;
          termination?: string | null;
          total_moves?: number | null;
          white_id?: string | null;
          white_rating_after?: number | null;
          white_rating_before?: number | null;
        };
        Relationships: [];
      };
      online_games: {
        Row: {
          black_id: string | null;
          black_time: number | null;
          completed_at: string | null;
          created_at: string;
          fen: string;
          host_id: string;
          id: string;
          invite_code: string;
          last_move: Json | null;
          last_move_at: string | null;
          pgn: string;
          result: string | null;
          saved_game_id: string | null;
          status: string;
          termination: string | null;
          time_control: string;
          turn: string;
          updated_at: string;
          version: number;
          white_id: string | null;
          white_time: number | null;
        };
        Insert: {
          black_id?: string | null;
          black_time?: number | null;
          completed_at?: string | null;
          created_at?: string;
          fen?: string;
          host_id: string;
          id?: string;
          invite_code: string;
          last_move?: Json | null;
          last_move_at?: string | null;
          pgn?: string;
          result?: string | null;
          saved_game_id?: string | null;
          status?: string;
          termination?: string | null;
          time_control?: string;
          turn?: string;
          updated_at?: string;
          version?: number;
          white_id?: string | null;
          white_time?: number | null;
        };
        Update: {
          black_id?: string | null;
          black_time?: number | null;
          completed_at?: string | null;
          created_at?: string;
          fen?: string;
          host_id?: string;
          id?: string;
          invite_code?: string;
          last_move?: Json | null;
          last_move_at?: string | null;
          pgn?: string;
          result?: string | null;
          saved_game_id?: string | null;
          status?: string;
          termination?: string | null;
          time_control?: string;
          turn?: string;
          updated_at?: string;
          version?: number;
          white_id?: string | null;
          white_time?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          city: string;
          coach_uses_this_month: number;
          created_at: string;
          draws: number;
          id: string;
          is_pro: boolean;
          losses: number;
          rating: number;
          username: string;
          wins: number;
        };
        Insert: {
          city?: string;
          coach_uses_this_month?: number;
          created_at?: string;
          draws?: number;
          id: string;
          is_pro?: boolean;
          losses?: number;
          rating?: number;
          username: string;
          wins?: number;
        };
        Update: {
          city?: string;
          coach_uses_this_month?: number;
          created_at?: string;
          draws?: number;
          id?: string;
          is_pro?: boolean;
          losses?: number;
          rating?: number;
          username?: string;
          wins?: number;
        };
        Relationships: [];
      };
      rating_history: {
        Row: {
          change: number;
          game_id: string | null;
          id: string;
          rating_after: number;
          recorded_at: string;
          user_id: string | null;
        };
        Insert: {
          change: number;
          game_id?: string | null;
          id?: string;
          rating_after: number;
          recorded_at?: string;
          user_id?: string | null;
        };
        Update: {
          change?: number;
          game_id?: string | null;
          id?: string;
          rating_after?: number;
          recorded_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard_view: {
        Row: {
          city: string | null;
          draws: number | null;
          global_rank: number | null;
          losses: number | null;
          rating: number | null;
          total_games: number | null;
          username: string | null;
          win_rate: number | null;
          wins: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DailyUsageRecord = Database["public"]["Tables"]["daily_usage"]["Row"];
export type GameRecord = Database["public"]["Tables"]["games"]["Row"];
export type OnlineGameRecord = Database["public"]["Tables"]["online_games"]["Row"];
export type RatingHistoryRecord =
  Database["public"]["Tables"]["rating_history"]["Row"];
export type LeaderboardEntry = Database["public"]["Views"]["leaderboard_view"]["Row"];

export type CoachCommentType =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "missed_tactic";

export interface CoachComment {
  betterMove: string;
  color: "w" | "b";
  explanation: string;
  fen: string;
  fenAfter: string;
  moveNumber: number;
  ply: number;
  san: string;
  type: CoachCommentType;
}

export type MoveClassification =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "missed_win";

export interface MoveAnalysis {
  ply: number;
  moveNumber: number;
  color: "w" | "b";
  san: string;
  playedUci: string;
  fenBefore: string;
  fenAfter: string;
  bestMoveSan: string | null;
  bestMoveUci: string | null;
  evalBefore: number;
  evalAfter: number;
  cpLoss: number;
  classification: MoveClassification;
  isMate: boolean;
  mateIn: number | null;
}

export interface CoachMomentInput {
  bestMoveSan: string | null;
  bestMoveUci: string | null;
  classification: MoveClassification;
  color: "w" | "b";
  cpLoss: number;
  evalAfter: number;
  evalBefore: number;
  fen: string;
  fenAfter: string;
  moveNumber: number;
  ply: number;
  san: string;
}

export interface CoachExplanation {
  bestMoveSan: string | null;
  betterPlan: string;
  classification: MoveClassification;
  color: "w" | "b";
  moveNumber: number;
  pattern: string;
  ply: number;
  san: string;
  whatMissed: string;
  whyFailed: string;
}

export interface GameAnalysis {
  moves: MoveAnalysis[];
  evals: number[];
  whiteAccuracy: number;
  blackAccuracy: number;
  blunders: { white: number; black: number };
  mistakes: { white: number; black: number };
  inaccuracies: { white: number; black: number };
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues extends LoginFormValues {
  city: string;
  confirmPassword: string;
  username: string;
}
