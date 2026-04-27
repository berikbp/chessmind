"use client";

import { evalToWhitePercent, formatEval } from "@/lib/chess/analysis";

interface EvalBarProps {
  cpWhitePerspective: number;
  mateIn: number | null;
  orientation: "white" | "black";
  height: string;
}

export function EvalBar({ cpWhitePerspective, mateIn, orientation, height }: EvalBarProps) {
  const whitePercent = evalToWhitePercent(cpWhitePerspective);
  const label = formatEval(cpWhitePerspective, mateIn);
  const whiteOnBottom = orientation === "white";
  const favoredSideIsOnTop =
    orientation === "white" ? cpWhitePerspective < 0 : cpWhitePerspective >= 0;

  return (
    <div
      className="relative flex w-5 flex-col overflow-hidden rounded-md border border-[var(--chess-border)]"
      style={{ height }}
      aria-label={`Engine evaluation ${label}`}
    >
      {whiteOnBottom ? (
        <>
          <div className="flex-1 bg-[#2b2418]" style={{ flexBasis: `${100 - whitePercent}%` }} />
          <div className="flex-1 bg-[#ead7b4]" style={{ flexBasis: `${whitePercent}%` }} />
        </>
      ) : (
        <>
          <div className="flex-1 bg-[#ead7b4]" style={{ flexBasis: `${whitePercent}%` }} />
          <div className="flex-1 bg-[#2b2418]" style={{ flexBasis: `${100 - whitePercent}%` }} />
        </>
      )}
      <span
        className={`absolute left-1/2 -translate-x-1/2 px-1 text-[10px] font-black tabular-nums ${
          favoredSideIsOnTop ? "top-1 text-white/90" : "bottom-1 text-black/85"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
