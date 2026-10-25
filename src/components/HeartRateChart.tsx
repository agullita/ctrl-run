import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatBpm, formatNumber, formatDuration, zoneLabel } from "../lib/format";
import type { HeartRateSample, ScoreResult } from "../lib/types";

type ChartPoint = {
  time: number;
  bpm: number;
  target: number | null;
  above: number | null;
  deficit: number | null;
  status: HeartRateSample["status"];
  points: number;
};

function buildChartData(result: ScoreResult): ChartPoint[] {
  const step = Math.max(1, Math.ceil(result.series.length / 900));
  const sampled = result.series.filter((_, index) => index % step === 0);
  const last = result.series[result.series.length - 1];

  if (last && sampled[sampled.length - 1]?.time !== last.time) {
    sampled.push(last);
  }

  return sampled.map((sample) => ({
    time: sample.time,
    bpm: sample.bpm,
    target:
      sample.status === "zone" || sample.status === "sweetspot"
        ? sample.bpm
        : null,
    above: sample.status === "above" ? sample.bpm : null,
    deficit: sample.status === "below" ? sample.bpm : null,
    status: sample.status,
    points: sample.points,
  }));
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  const color =
    point.status === "above"
      ? "#ff2b1c"
      : point.status === "below"
        ? "#9aa29a"
        : "#39ff14";

  return (
    <div className="border border-signal/30 bg-black/95 px-3 py-2.5 font-mono shadow-[0_0_24px_rgba(0,0,0,0.8)]">
      <div className="text-[8px] uppercase tracking-[0.18em] text-white/30">
        T+ {formatDuration(point.time)}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-bold text-white">{point.bpm}</span>
        <span className="text-[8px] uppercase tracking-[0.15em] text-white/35">
          bpm
        </span>
        <span
          className={`ml-auto text-[9px] font-bold ${point.points >= 0 ? "text-signal" : "text-blood-bright"}`}
        >
          {point.points >= 0 ? "+" : "−"}
          {formatNumber(Math.abs(point.points))}
        </span>
      </div>
      <div className="mt-1 text-[8px] uppercase tracking-[0.14em]" style={{ color }}>
        {zoneLabel(point.status)}
      </div>
    </div>
  );
}

export function HeartRateChart({ result }: { result: ScoreResult }) {
  const data = useMemo(() => buildChartData(result), [result]);
  const { zoneMin, zoneMax, sweetSpotMin, sweetSpotMax } = result.config;
  const minBpm = Math.max(70, Math.min(zoneMin - 15, result.minBpm - 8));
  const maxBpm = Math.min(220, Math.max(zoneMax + 15, result.maxBpm + 8));

  const buckets = useMemo(() => {
    const count = 120;
    const size = Math.max(1, Math.ceil(result.series.length / count));
    const output: HeartRateSample["status"][] = [];

    for (let start = 0; start < result.series.length; start += size) {
      const bucket = result.series.slice(start, start + size);
      const worst = bucket.reduce((current, sample) => {
        const rank = { sweetspot: 0, zone: 1, below: 2, above: 3 } as const;
        return rank[sample.status] > rank[current] ? sample.status : current;
      }, "sweetspot" as HeartRateSample["status"]);
      output.push(worst);
    }

    return output;
  }, [result.series]);

  return (
    <div>
      <div className="h-[330px] w-full sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 10, bottom: 4, left: -14 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.055)" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={[0, result.elapsedSeconds]}
              tickFormatter={(value: number) => formatDuration(value)}
              tick={{
                fill: "rgba(255,255,255,0.28)",
                fontSize: 9,
                fontFamily: "JetBrains Mono Variable",
              }}
              axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              domain={[minBpm, maxBpm]}
              tickCount={8}
              tick={{
                fill: "rgba(255,255,255,0.28)",
                fontSize: 9,
                fontFamily: "JetBrains Mono Variable",
              }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              content={ChartTooltip}
              cursor={{ stroke: "rgba(57,255,20,0.35)", strokeDasharray: "3 3" }}
            />

            <ReferenceArea
              y1={zoneMin}
              y2={zoneMax}
              fill="#39ff14"
              fillOpacity={0.13}
              stroke="rgba(57,255,20,0.42)"
              strokeOpacity={0.75}
              strokeDasharray="3 5"
              label={{
                value: `PASILLO Z2 ${zoneMin}—${zoneMax}`,
                position: "insideTopLeft",
                fill: "rgba(57,255,20,0.58)",
                fontSize: 8,
                fontFamily: "JetBrains Mono Variable",
              }}
              ifOverflow="extendDomain"
            />
            <ReferenceArea
              y1={zoneMax}
              y2={maxBpm}
              fill="#b30000"
              fillOpacity={0.065}
              ifOverflow="extendDomain"
            />
            <ReferenceLine
              y={zoneMax}
              stroke="rgba(255,43,28,0.85)"
              strokeDasharray="4 3"
              strokeWidth={1.2}
              label={{
                value: "TECHO / EGO",
                position: "insideTopRight",
                fill: "rgba(255,43,28,0.65)",
                fontSize: 7,
                fontFamily: "JetBrains Mono Variable",
              }}
            />
            <ReferenceLine
              y={zoneMin}
              stroke="rgba(57,255,20,0.72)"
              strokeDasharray="3 4"
              strokeWidth={1.1}
            />
            <ReferenceArea
              y1={sweetSpotMin}
              y2={sweetSpotMax}
              fill="#c8ffb9"
              fillOpacity={0.22}
              stroke="#c8ffb9"
              strokeOpacity={0.7}
              strokeDasharray="2 3"
              label={{
                value: `SWEET BAND ${formatBpm(sweetSpotMin)}—${formatBpm(sweetSpotMax)}`,
                position: "insideTopRight",
                fill: "rgba(218,255,205,0.85)",
                fontSize: 8,
                fontFamily: "JetBrains Mono Variable",
              }}
              ifOverflow="extendDomain"
            />

            <Area
              type="monotone"
              dataKey="above"
              baseValue={zoneMax}
              stroke="none"
              fill="#b30000"
              fillOpacity={0.42}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="deficit"
              baseValue={zoneMin}
              stroke="none"
              fill="#8b958b"
              fillOpacity={0.24}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="bpm"
              stroke="#39ff14"
              strokeOpacity={0.15}
              strokeWidth={1}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="deficit"
              stroke="#9aa29a"
              strokeWidth={1.6}
              dot={false}
              activeDot={{ r: 3, fill: "#9aa29a", stroke: "#050505", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="above"
              stroke="#ff2b1c"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 3, fill: "#ff2b1c", stroke: "#050505", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#39ff14"
              strokeWidth={1.6}
              dot={false}
              activeDot={{ r: 3, fill: "#39ff14", stroke: "#050505", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 flex items-center gap-[2px]" aria-hidden="true">
        {buckets.map((status, index) => (
          <span
            key={index}
            className={`h-2 flex-1 ${
              status === "above"
                ? "bg-blood-bright"
                : status === "below"
                  ? "bg-white/20"
                  : status === "sweetspot"
                    ? "bg-[#c8ffb9]"
                    : "bg-signal/70"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[8px] uppercase tracking-[0.13em] text-white/35">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 border border-signal/60 bg-signal/15" /> PASILLO Z2 {zoneMin}-{zoneMax}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 bg-[#c8ffb9]" /> SWEET BAND {formatBpm(sweetSpotMin)}—{formatBpm(sweetSpotMax)}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 bg-blood" /> EGO &gt;{zoneMax}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 bg-white/20" /> DÉFICIT &lt;{zoneMin}
        </span>
        <span className="ml-auto hidden sm:inline">1 SAMPLE = 1 SECOND</span>
      </div>
    </div>
  );
}
