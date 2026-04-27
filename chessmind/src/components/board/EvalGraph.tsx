"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { GameAnalysis } from "@/types";

interface EvalGraphProps {
  analysis: GameAnalysis;
  currentPly: number;
  onSelectPly: (ply: number) => void;
  height?: number;
}

const CLAMP = 5;

function clampPawns(cp: number): number {
  const pawns = cp / 100;
  return Math.max(-CLAMP, Math.min(CLAMP, pawns));
}

export function EvalGraph({ analysis, currentPly, onSelectPly, height = 128 }: EvalGraphProps) {
  const data = useMemo(
    () =>
      analysis.evals.map((cp, idx) => ({
        ply: idx,
        eval: clampPawns(cp),
      })),
    [analysis.evals],
  );

  const blunderPoints = useMemo(
    () =>
      analysis.moves
        .filter((m) => m.classification === "blunder" || m.classification === "missed_win")
        .map((m) => ({ ply: m.ply, y: clampPawns(m.evalAfter) })),
    [analysis.moves],
  );

  return (
    <div
      className="min-h-16 min-w-0 w-full cursor-crosshair select-none rounded-xl border border-[var(--chess-border)]/70 bg-black/16 p-1"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 6, right: 10, bottom: 2, left: 2 }}
          onClick={(state) => {
            if (state && typeof state.activeLabel === "number") {
              onSelectPly(state.activeLabel as number);
            }
          }}
        >
          <defs>
            <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ead7b4" stopOpacity={0.55} />
              <stop offset="50%" stopColor="#ead7b4" stopOpacity={0.05} />
              <stop offset="50%" stopColor="#2b2418" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#2b2418" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <XAxis dataKey="ply" hide domain={[0, data.length - 1]} type="number" />
          <YAxis hide domain={[-CLAMP, CLAMP]} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 4" />
          <ReferenceLine
            x={currentPly}
            stroke="var(--chess-green)"
            strokeWidth={2}
            ifOverflow="visible"
          />
          <Area
            type="monotone"
            dataKey="eval"
            stroke="rgba(234,215,180,0.8)"
            strokeWidth={1.5}
            fill="url(#evalGradient)"
            isAnimationActive={false}
          />
          {blunderPoints.map((p) => (
            <ReferenceDot key={p.ply} x={p.ply} y={p.y} r={3} fill="#fb7185" stroke="none" />
          ))}
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.3)", strokeWidth: 1 }}
            contentStyle={{
              background: "rgba(20,16,9,0.95)",
              border: "1px solid var(--chess-border)",
              borderRadius: "0.5rem",
              fontSize: "0.7rem",
              padding: "0.25rem 0.5rem",
            }}
            labelFormatter={(label) => `Move ${Math.ceil((Number(label) || 0) / 2)}`}
            formatter={(value) => {
              const num = Number(value) || 0;
              return [`${num >= 0 ? "+" : ""}${num.toFixed(2)}`, "Eval"];
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
