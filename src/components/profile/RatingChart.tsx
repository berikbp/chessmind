"use client";

import { CalendarDays } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartPoint {
  game: number;
  rating: number;
  change: number;
}

export function RatingChart({ data }: { data: ChartPoint[] }) {
  return (
    <section className="card-surface rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--chess-green)]">
            Rating
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-[var(--chess-cream)]">
            Last 20 games
          </h2>
        </div>
        <CalendarDays className="h-5 w-5 text-[var(--chess-gold)]" aria-hidden="true" />
      </div>

      <div className="h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ bottom: 10, left: -16, right: 16, top: 10 }}>
            <CartesianGrid stroke="rgba(247,237,220,0.12)" vertical={false} />
            <XAxis
              dataKey="game"
              tick={{ fill: "var(--chess-cream-muted)", fontSize: 12, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["dataMin - 24", "dataMax + 24"]}
              tick={{ fill: "var(--chess-cream-muted)", fontSize: 12, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#211a12",
                border: "1px solid var(--chess-border)",
                borderRadius: 16,
                color: "var(--chess-cream)",
              }}
              formatter={(value, name) => [value, name === "rating" ? "Rating" : "Change"]}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="var(--chess-green)"
              strokeWidth={3}
              dot={{ fill: "var(--chess-gold)", r: 4, strokeWidth: 0 }}
              activeDot={{ fill: "var(--chess-green)", r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
