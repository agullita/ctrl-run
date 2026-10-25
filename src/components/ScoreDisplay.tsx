import { useEffect, useState } from "react";
import { formatNumber } from "../lib/format";
import { getVerdict } from "../lib/scoring";
import type { ScoreResult, Verdict } from "../lib/types";

function useCountUp(value: number, duration = 950): number {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return display;
}

const toneText = {
  signal: "text-signal",
  warning: "text-warning",
  blood: "text-blood-bright",
};

const toneBorder = {
  signal: "border-signal/35",
  warning: "border-warning/35",
  blood: "border-blood-bright/40",
};

export function ScoreDisplay({ result }: { result: ScoreResult }) {
  const verdict = getVerdict(result.score1000, result);
  const score = useCountUp(result.score1000);

  return (
    <div className={`relative border bg-black/50 px-5 py-6 sm:px-8 sm:py-8 ${toneBorder[verdict.tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/35">
          Puntos de precisión
        </span>
        <span className={`font-mono text-[8px] uppercase tracking-[0.18em] ${toneText[verdict.tone]}`}>
          {verdict.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className={`font-mono text-[clamp(3.4rem,8vw,6.5rem)] font-bold leading-[0.82] tracking-[-0.08em] ${toneText[verdict.tone]}`}>
          <span className="mr-1 text-white/15">[</span>
          {String(score).padStart(4, "0")}
          <span className="ml-1 text-white/15">]</span>
        </span>
        <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
          / 1000
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-white/[0.08] pt-3 font-mono text-[8px] uppercase tracking-[0.14em]">
        <span className="text-white/30">Penalización bruta</span>
        <span className="text-white/55">{formatNumber(result.penaltyPoints)} PTS</span>
      </div>

      <div className="mt-4">
        <ScoreMeter percent={result.score1000 / 10} tone={verdict.tone} />
      </div>

      <div className="mt-3 flex justify-between font-mono text-[7.5px] uppercase tracking-[0.13em] text-white/25">
        <span>0000</span>
        <span>0600</span>
        <span>0900</span>
        <span>1000</span>
      </div>
    </div>
  );
}

export function ScoreMeter({
  percent,
  tone,
  className = "",
}: {
  percent: number;
  tone: Verdict["tone"];
  className?: string;
}) {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * 40);
  const color =
    tone === "signal"
      ? "bg-signal"
      : tone === "warning"
        ? "bg-warning"
        : "bg-blood-bright";

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-[3px]">
        {Array.from({ length: 40 }).map((_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 ${index < filled ? color : "bg-white/10"}`}
          />
        ))}
      </div>
      <span className="absolute -bottom-1 left-1/2 h-4 w-px bg-white/20" />
    </div>
  );
}
