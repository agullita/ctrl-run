import { formatBpm } from "../lib/format";
import { BracketLabel } from "./Icons";
import type { ZoneKey, ZoneRange } from "../lib/types";

function percent(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export function TargetGauge({
  zone,
  zoneKey = "z2",
  current,
  className = "",
}: {
  zone: ZoneRange;
  zoneKey?: ZoneKey;
  current?: number;
  className?: string;
}) {
  const min = Math.max(70, zone.min - 25);
  const max = Math.min(220, zone.max + 25);
  const targetBpm = (zone.min + zone.max) / 2;
  const sweetMin = targetBpm - 2;
  const sweetMax = targetBpm + 2;
  const targetStart = percent(zone.min, min, max);
  const targetWidth = percent(zone.max, min, max) - targetStart;
  const sweetStart = percent(sweetMin, min, max);
  const sweetWidth = percent(sweetMax, min, max) - sweetStart;
  const targetCenter = percent(targetBpm, min, max);
  const marker = percent(current ?? targetBpm, min, max);
  const ticks = Array.from(
    new Set([min, zone.min, targetBpm, zone.max, max]),
  ).sort((a, b) => a - b);

  return (
    <div className={`relative ${className}`}>
      <div className="mb-2 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
        <BracketLabel>TARGET BAND / DINÁMICO</BracketLabel>
        <span className="text-signal/70">
          {zoneKey.toUpperCase()} / {zone.min} — {zone.max} BPM
        </span>
      </div>

      <div className="relative h-9 border border-white/10 bg-black/60">
        <div className="absolute inset-y-0 left-0 bg-white/[0.025]" style={{ width: `${targetStart}%` }} />
        <div
          className="absolute inset-y-0 bg-signal/[0.14]"
          style={{ left: `${targetStart}%`, width: `${targetWidth}%` }}
        />
        <div
          className="absolute inset-y-0 bg-blood/[0.18]"
          style={{ left: `${targetStart + targetWidth}%`, right: 0 }}
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
          className="absolute inset-y-0 border-x border-[#c8ffb9]/70 bg-[#c8ffb9]/20 shadow-[0_0_12px_rgba(200,255,185,0.18)]"
          style={{ left: `${sweetStart}%`, width: `${sweetWidth}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-[#c8ffb9] shadow-[0_0_8px_rgba(200,255,185,0.9)]"
          style={{ left: `${targetCenter}%` }}
        />

        <div
          className="absolute -top-1 z-10 h-11 w-[3px] bg-white transition-[left] duration-500 ease-out"
          style={{ left: `calc(${marker}% - 1.5px)` }}
        >
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.12em] text-white/70">
            {current ?? "HOLD"}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <span className="translate-y-[calc(100%+7px)] font-mono text-[7px] uppercase tracking-[0.13em] text-[#d7ffd0]/75">
            SWEET {formatBpm(sweetMin)}—{formatBpm(sweetMax)}
          </span>
        </div>

        <div
          className="absolute bottom-0 top-0 w-px bg-signal/25 animate-scan"
          style={{ left: `${marker}%` }}
        />
      </div>

      <div className="relative mt-7 h-4 font-mono text-[7px] tracking-[0.08em] text-white/25">
        {ticks.map((tick) => (
          <span
            key={tick}
            className={`absolute -translate-x-1/2 ${
              tick === zone.min || tick === zone.max
                ? "text-signal/60"
                : tick === targetBpm
                  ? "text-white/60"
                  : ""
            }`}
            style={{ left: `${percent(tick, min, max)}%` }}
          >
            {formatBpm(tick)}
          </span>
        ))}
      </div>
    </div>
  );
}
