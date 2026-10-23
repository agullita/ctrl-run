import { BracketLabel } from "./Icons";

const MIN = 100;
const MAX = 160;

function percent(bpm: number): number {
  return Math.min(100, Math.max(0, ((bpm - MIN) / (MAX - MIN)) * 100));
}

export function TargetGauge({
  current,
  className = "",
}: {
  current?: number;
  className?: string;
}) {
  const targetStart = percent(125);
  const targetWidth = percent(135) - targetStart;
  const redStart = percent(145);
  const marker = percent(current ?? 130);

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
        <BracketLabel>TARGET BAND</BracketLabel>
        <span className="text-signal/70">125 — 135 BPM</span>
      </div>

      <div className="relative h-9 border border-white/10 bg-black/60">
        <div
          className="absolute inset-y-0 bg-signal/[0.14]"
          style={{ left: `${targetStart}%`, width: `${targetWidth}%` }}
        />
        <div
          className="absolute inset-y-0 bg-blood/[0.18]"
          style={{ left: `${redStart}%`, right: 0 }}
        />
        <div
          className="absolute inset-y-0 w-px bg-signal"
          style={{ left: `${targetStart}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-signal"
          style={{ left: `${targetStart + targetWidth}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-blood-bright/70"
          style={{ left: `${redStart}%` }}
        />

        <div
          className="absolute -top-1 z-10 h-11 w-[3px] bg-white transition-[left] duration-500 ease-out"
          style={{ left: `calc(${marker}% - 1.5px)` }}
        >
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.12em] text-white/70">
            {current ?? "HOLD"}
          </span>
        </div>

        <div
          className="absolute bottom-0 top-0 w-px bg-signal/25 animate-scan"
          style={{ left: `${marker}%` }}
        />
      </div>

      <div className="relative mt-2 h-4 font-mono text-[7px] tracking-[0.08em] text-white/25">
        {[100, 115, 125, 135, 145, 160].map((tick) => (
          <span
            key={tick}
            className={`absolute -translate-x-1/2 ${
              tick === 125 || tick === 135 ? "text-signal/60" : ""
            } ${tick === 145 ? "text-blood-bright/60" : ""}`}
            style={{ left: `${percent(tick)}%` }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}
