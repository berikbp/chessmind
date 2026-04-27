import { Chess } from "chess.js";
import { NextResponse } from "next/server";

import { getOpenAIClient, OPENAI_COACH_MODEL } from "@/lib/openai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DAILY_COACH_REVIEW_LIMIT,
  consumeDailyUsage,
  dailyUsageSetupMessage,
  getDailyUsageSummary,
  isDailyUsageSetupError,
} from "@/lib/usage/daily-limits";
import type {
  CoachComment,
  CoachCommentType,
  CoachExplanation,
  CoachMomentInput,
  MoveClassification,
  Profile,
} from "@/types";

export const runtime = "nodejs";

const MAX_REVIEW_COACH_MOMENTS = 10;
const COACH_COMMENT_TYPES: CoachCommentType[] = [
  "best",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
  "missed_tactic",
];
const MOVE_CLASSIFICATIONS: MoveClassification[] = [
  "best",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
  "missed_win",
];

interface CoachRequestBody {
  moments?: CoachMomentInput[];
  pgn: string;
  playerColor: "w" | "b";
}

interface MoveSummary {
  color: "w" | "b";
  fen: string;
  fenAfter: string;
  moveNumber: number;
  ply: number;
  san: string;
}

interface DraftCoachComment {
  betterMove: string;
  explanation: string;
  movePly: number;
  type: CoachCommentType;
}

interface DraftCoachExplanation {
  betterPlan: string;
  movePly: number;
  pattern: string;
  whatMissed: string;
  whyFailed: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCoachCommentType(value: unknown): value is CoachCommentType {
  return typeof value === "string" && COACH_COMMENT_TYPES.includes(value as CoachCommentType);
}

function isMoveClassification(value: unknown): value is MoveClassification {
  return typeof value === "string" && MOVE_CLASSIFICATIONS.includes(value as MoveClassification);
}

function parseNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseCoachRequest(body: unknown): CoachRequestBody | null {
  if (!isRecord(body)) return null;
  const pgn = typeof body.pgn === "string" ? body.pgn.trim() : undefined;
  const playerColor = body.playerColor === "w" || body.playerColor === "b" ? body.playerColor : undefined;
  if (!pgn || !playerColor) return null;

  const moments = Array.isArray(body.moments)
    ? body.moments.map(parseCoachMoment).filter((moment): moment is CoachMomentInput => moment !== null)
    : undefined;

  if (Array.isArray(body.moments) && moments?.length !== body.moments.length) return null;

  return { moments, pgn, playerColor };
}

function parseCoachMoment(value: unknown): CoachMomentInput | null {
  if (!isRecord(value)) return null;

  const {
    bestMoveSan,
    bestMoveUci,
    classification,
    color,
    cpLoss,
    evalAfter,
    evalBefore,
    fen,
    fenAfter,
    moveNumber,
    ply,
    san,
  } = value;

  if (!isMoveClassification(classification)) return null;
  if (color !== "w" && color !== "b") return null;
  if (typeof fen !== "string" || fen.trim().length === 0) return null;
  if (typeof fenAfter !== "string" || fenAfter.trim().length === 0) return null;
  if (typeof san !== "string" || san.trim().length === 0) return null;
  if (typeof ply !== "number" || !Number.isInteger(ply)) return null;
  if (typeof moveNumber !== "number" || !Number.isInteger(moveNumber)) return null;

  const safeEvalBefore = parseNumber(evalBefore);
  const safeEvalAfter = parseNumber(evalAfter);
  const safeCpLoss = parseNumber(cpLoss);
  if (safeEvalBefore === null || safeEvalAfter === null || safeCpLoss === null) return null;

  return {
    bestMoveSan: typeof bestMoveSan === "string" && bestMoveSan.trim() ? bestMoveSan.trim() : null,
    bestMoveUci: typeof bestMoveUci === "string" && bestMoveUci.trim() ? bestMoveUci.trim() : null,
    classification,
    color,
    cpLoss: safeCpLoss,
    evalAfter: safeEvalAfter,
    evalBefore: safeEvalBefore,
    fen: fen.trim(),
    fenAfter: fenAfter.trim(),
    moveNumber,
    ply,
    san: san.trim(),
  };
}

function buildMoveSummaries(pgn: string): MoveSummary[] {
  const game = new Chess();
  game.loadPgn(pgn, { strict: false });

  return game.history({ verbose: true }).map((move, index) => ({
    color: move.color,
    fen: move.before,
    fenAfter: move.after,
    moveNumber: Math.floor(index / 2) + 1,
    ply: index + 1,
    san: move.san,
  }));
}

function buildPrompt({
  moves,
  pgn,
  playerColor,
}: {
  moves: MoveSummary[];
  pgn: string;
  playerColor: "w" | "b";
}) {
  const playerLabel = playerColor === "w" ? "White" : "Black";
  const playerMoves = moves.filter((move) => move.color === playerColor);
  const candidateMoves = playerMoves.length >= 5 ? playerMoves : moves;

  return [
    `Analyze this chess game for the ${playerLabel} player.`,
    "Choose exactly 5 instructive moments from the candidate move list.",
    "Prefer the player's own moves. If there are fewer than 5 player moves, include the most useful opponent moves too.",
    "Use only movePly values from the candidate list. Do not invent moves.",
    "Keep each explanation under 34 words, concrete, and beginner-friendly.",
    "For betterMove, use SAN when there is a clear improvement; otherwise write \"No clear improvement\".",
    "",
    "PGN:",
    pgn,
    "",
    "Candidate moves:",
    JSON.stringify(
      candidateMoves.map(({ color, moveNumber, ply, san }) => ({
        color: color === "w" ? "White" : "Black",
        moveNumber,
        ply,
        san,
      })),
    ),
  ].join("\n");
}

function buildReviewPrompt({
  moments,
  pgn,
  playerColor,
}: {
  moments: CoachMomentInput[];
  pgn: string;
  playerColor: "w" | "b";
}) {
  const playerLabel = playerColor === "w" ? "White" : "Black";

  return [
    `Explain these Stockfish-selected review moments for the ${playerLabel} player.`,
    "Stockfish is the source of truth. Do not change the classification or best move.",
    "Return exactly one explanation object per moment, using the same movePly values.",
    "Return the explanations in ascending movePly order.",
    "For blunders, mistakes, inaccuracies, and missed wins, explain why the played move failed.",
    "For best and good moves, use whyFailed to explain why the move mattered, and whatMissed to describe the key idea it found.",
    "Use plain coaching language. Be concrete: name the tactic, square weakness, king safety issue, pawn break, or piece activity problem.",
    "Keep whyFailed, whatMissed, and betterPlan under 14 words each.",
    "Keep pattern under 6 words.",
    "",
    "PGN:",
    pgn,
    "",
    "Moments:",
    JSON.stringify(
      moments.map((moment) => ({
        bestMoveSan: moment.bestMoveSan ?? "No clear improvement",
        classification: moment.classification,
        color: moment.color === "w" ? "White" : "Black",
        cpLoss: Math.round(moment.cpLoss),
        evalAfter: Math.round(moment.evalAfter),
        evalBefore: Math.round(moment.evalBefore),
        fen: moment.fen,
        fenAfter: moment.fenAfter,
        moveNumber: moment.moveNumber,
        movePly: moment.ply,
        san: moment.san,
      })),
    ),
  ].join("\n");
}

function parseOpenAIJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

function validateDraftComments(value: unknown, allowedPly: Set<number>): DraftCoachComment[] {
  if (!isRecord(value) || !Array.isArray(value.comments) || value.comments.length !== 5) {
    throw new Error("Coach response must contain exactly 5 comments.");
  }

  const seenPly = new Set<number>();

  return value.comments.map((comment) => {
    if (!isRecord(comment)) throw new Error("Coach comment must be an object.");

    const { betterMove, explanation, movePly, type } = comment;
    if (typeof movePly !== "number" || !Number.isInteger(movePly) || !allowedPly.has(movePly)) {
      throw new Error("Coach comment references an invalid move.");
    }
    if (seenPly.has(movePly)) {
      throw new Error("Coach response contains duplicate move references.");
    }
    if (!isCoachCommentType(type)) {
      throw new Error("Coach comment has an invalid type.");
    }
    if (typeof explanation !== "string" || explanation.trim().length < 8) {
      throw new Error("Coach comment explanation is invalid.");
    }
    if (typeof betterMove !== "string" || betterMove.trim().length === 0) {
      throw new Error("Coach comment betterMove is invalid.");
    }

    seenPly.add(movePly);

    return {
      betterMove: betterMove.trim(),
      explanation: explanation.trim(),
      movePly,
      type,
    };
  });
}

function compactCoachText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : fallback;
}

function fallbackPattern(classification: MoveClassification) {
  switch (classification) {
    case "best":
      return "best move";
    case "good":
      return "healthy move";
    case "inaccuracy":
      return "small concession";
    case "mistake":
      return "missed resource";
    case "blunder":
      return "major tactic";
    case "missed_win":
      return "missed win";
  }
}

function fallbackDraftExplanation(moment: CoachMomentInput): DraftCoachExplanation {
  const bestMove = moment.bestMoveSan ?? "a stronger move";

  if (moment.classification === "best" || moment.classification === "good") {
    return {
      betterPlan: "Keep improving pieces without allowing counterplay.",
      movePly: moment.ply,
      pattern: fallbackPattern(moment.classification),
      whatMissed: "It followed the engine's main idea.",
      whyFailed: `${moment.san} kept the position under control.`,
    };
  }

  return {
    betterPlan: `Check ${bestMove} before committing to the move.`,
    movePly: moment.ply,
    pattern: fallbackPattern(moment.classification),
    whatMissed: `${bestMove} was the stronger resource.`,
    whyFailed: `${moment.san} gave the opponent an easier plan.`,
  };
}

function normalizeDraftExplanations(value: unknown, moments: CoachMomentInput[]): DraftCoachExplanation[] {
  const draftByPly = new Map<number, DraftCoachExplanation>();
  const momentByPly = new Map(moments.map((moment) => [moment.ply, moment]));
  const explanations = isRecord(value) && Array.isArray(value.explanations) ? value.explanations : [];

  for (const explanation of explanations) {
    if (!isRecord(explanation)) continue;

    const movePly = explanation.movePly;
    if (typeof movePly !== "number" || !Number.isInteger(movePly) || draftByPly.has(movePly)) {
      continue;
    }

    const moment = momentByPly.get(movePly);
    if (!moment) continue;

    const fallback = fallbackDraftExplanation(moment);
    draftByPly.set(movePly, {
      betterPlan: compactCoachText(explanation.betterPlan, fallback.betterPlan),
      movePly,
      pattern: compactCoachText(explanation.pattern, fallback.pattern),
      whatMissed: compactCoachText(explanation.whatMissed, fallback.whatMissed),
      whyFailed: compactCoachText(explanation.whyFailed, fallback.whyFailed),
    });
  }

  return moments.map((moment) => draftByPly.get(moment.ply) ?? fallbackDraftExplanation(moment));
}

function enrichComments(drafts: DraftCoachComment[], moves: MoveSummary[]): CoachComment[] {
  const moveByPly = new Map(moves.map((move) => [move.ply, move]));

  return drafts.map((draft) => {
    const move = moveByPly.get(draft.movePly);
    if (!move) throw new Error("Coach comment references an unknown move.");

    return {
      betterMove: draft.betterMove,
      color: move.color,
      explanation: draft.explanation,
      fen: move.fen,
      fenAfter: move.fenAfter,
      moveNumber: move.moveNumber,
      ply: move.ply,
      san: move.san,
      type: draft.type,
    };
  });
}

function enrichExplanations(
  drafts: DraftCoachExplanation[],
  moments: CoachMomentInput[],
  moves: MoveSummary[],
): CoachExplanation[] {
  const momentByPly = new Map(moments.map((moment) => [moment.ply, moment]));
  const moveByPly = new Map(moves.map((move) => [move.ply, move]));

  return drafts.map((draft) => {
    const moment = momentByPly.get(draft.movePly);
    const move = moveByPly.get(draft.movePly);
    if (!moment || !move) throw new Error("Coach explanation references an unknown move.");

    return {
      bestMoveSan: moment.bestMoveSan,
      betterPlan: draft.betterPlan,
      classification: moment.classification,
      color: move.color,
      moveNumber: move.moveNumber,
      pattern: draft.pattern,
      ply: move.ply,
      san: move.san,
      whatMissed: draft.whatMissed,
      whyFailed: draft.whyFailed,
    };
  }).sort((a, b) => a.ply - b.ply);
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = parseCoachRequest(await req.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { error: "Expected JSON body with pgn and playerColor ('w' or 'b')." },
      { status: 400 },
    );
  }

  const { data: rawProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as Profile | null;

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  let dailyUsage;
  try {
    dailyUsage = await getDailyUsageSummary({
      isPro: profile.is_pro,
      userId: user.id,
    });
  } catch (usageError) {
    if (isDailyUsageSetupError(usageError)) {
      return NextResponse.json(
        {
          code: "DAILY_USAGE_NOT_CONFIGURED",
          error: dailyUsageSetupMessage(),
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          usageError instanceof Error
            ? usageError.message
            : "Daily usage tracking is not configured.",
      },
      { status: 500 },
    );
  }

  if (!profile.is_pro && dailyUsage.coachReview.remaining === 0) {
    return NextResponse.json(
      {
        code: "COACH_LIMIT_REACHED",
        error: "Daily free coach limit reached.",
        limit: DAILY_COACH_REVIEW_LIMIT,
        resetsAt: dailyUsage.coachReview.resetsAt,
        usageDate: dailyUsage.usageDate,
        usesRemaining: 0,
        usesToday: dailyUsage.coachReview.used,
      },
      { status: 429 },
    );
  }

  let moves: MoveSummary[];
  try {
    moves = buildMoveSummaries(body.pgn);
  } catch {
    return NextResponse.json({ error: "Invalid PGN." }, { status: 400 });
  }

  if (moves.length < 5) {
    return NextResponse.json(
      { error: "Game must contain at least 5 moves for coach analysis." },
      { status: 400 },
    );
  }

  try {
    const openai = getOpenAIClient();
    const reviewMoments = body.moments?.slice(0, MAX_REVIEW_COACH_MOMENTS) ?? [];
    const isReviewExplanationRequest = reviewMoments.length > 0;

    if (isReviewExplanationRequest) {
      const moveByPly = new Map(moves.map((move) => [move.ply, move]));
      for (const moment of reviewMoments) {
        const move = moveByPly.get(moment.ply);
        if (
          !move ||
          move.san !== moment.san ||
          move.color !== moment.color ||
          move.fen !== moment.fen ||
          move.fenAfter !== moment.fenAfter
        ) {
          return NextResponse.json({ error: "Review moment does not match this PGN." }, { status: 400 });
        }
      }

      const completion = await openai.chat.completions.create({
        model: OPENAI_COACH_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are ChessMind's review coach. Return JSON only. Explain the lesson behind each move using the provided Stockfish facts; never invent engine lines.",
          },
          {
            role: "user",
            content: buildReviewPrompt({
              moments: reviewMoments,
              pgn: body.pgn,
              playerColor: body.playerColor,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "coach_review_explanations",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["explanations"],
              properties: {
                explanations: {
                  type: "array",
                  minItems: reviewMoments.length,
                  maxItems: reviewMoments.length,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["movePly", "whyFailed", "whatMissed", "betterPlan", "pattern"],
                    properties: {
                      movePly: { type: "integer" },
                      whyFailed: { type: "string" },
                      whatMissed: { type: "string" },
                      betterPlan: { type: "string" },
                      pattern: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        temperature: 0.2,
        max_completion_tokens: 2200,
        user: user.id,
      });

      const rawContent = completion.choices[0]?.message.content;
      if (!rawContent) throw new Error("OpenAI returned an empty response.");

      const drafts = normalizeDraftExplanations(parseOpenAIJson(rawContent), reviewMoments);
      const explanations = enrichExplanations(drafts, reviewMoments, moves);
      let dailyUse;
      try {
        dailyUse = await consumeDailyUsage({
          isPro: profile.is_pro,
          kind: "coach_review",
          userId: user.id,
        });
      } catch (usageError) {
        if (isDailyUsageSetupError(usageError)) {
          return NextResponse.json(
            {
              code: "DAILY_USAGE_NOT_CONFIGURED",
              error: dailyUsageSetupMessage(),
            },
            { status: 503 },
          );
        }

        return NextResponse.json(
          {
            error:
              usageError instanceof Error
                ? usageError.message
                : "Daily usage tracking is not configured.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        explanations,
        limit: dailyUse.status.limit,
        model: OPENAI_COACH_MODEL,
        resetsAt: dailyUse.status.resetsAt,
        usageDate: dailyUse.status.usageDate,
        usesRemaining: dailyUse.status.remaining,
        usesToday: dailyUse.status.used,
      });
    }

    const completion = await openai.chat.completions.create({
      model: OPENAI_COACH_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are ChessMind's chess coach. Return concise instructional JSON only. Focus on practical chess ideas, not engine-depth notation.",
        },
        {
          role: "user",
          content: buildPrompt({ moves, pgn: body.pgn, playerColor: body.playerColor }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "coach_comments",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["comments"],
            properties: {
              comments: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["movePly", "type", "explanation", "betterMove"],
                  properties: {
                    movePly: { type: "integer" },
                    type: {
                      type: "string",
                      enum: COACH_COMMENT_TYPES,
                    },
                    explanation: { type: "string" },
                    betterMove: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      temperature: 0.25,
      max_completion_tokens: 900,
      user: user.id,
    });

    const rawContent = completion.choices[0]?.message.content;
    if (!rawContent) throw new Error("OpenAI returned an empty response.");

    const allowedPly = new Set(moves.map((move) => move.ply));
    const drafts = validateDraftComments(parseOpenAIJson(rawContent), allowedPly);
    const comments = enrichComments(drafts, moves);
    let dailyUse;
    try {
      dailyUse = await consumeDailyUsage({
        isPro: profile.is_pro,
        kind: "coach_review",
        userId: user.id,
      });
    } catch (usageError) {
      if (isDailyUsageSetupError(usageError)) {
        return NextResponse.json(
          {
            code: "DAILY_USAGE_NOT_CONFIGURED",
            error: dailyUsageSetupMessage(),
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          error:
            usageError instanceof Error
              ? usageError.message
              : "Daily usage tracking is not configured.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      comments,
      limit: dailyUse.status.limit,
      model: OPENAI_COACH_MODEL,
      resetsAt: dailyUse.status.resetsAt,
      usageDate: dailyUse.status.usageDate,
      usesRemaining: dailyUse.status.remaining,
      usesToday: dailyUse.status.used,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Coach analysis failed." },
      { status: 502 },
    );
  }
}
