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
} from "recharts";
import { formatDuration, zoneLabel } from "../lib/format";
import type { HeartRateSample, ScoreResult } from "../lib/types";

type ChartPoint = {
  time: number;
  bpm: number;
  target: number | null;
  above: number | null;
  redline: number | null;
  deficit: number | null;
  ego: number | null;
  label: string;
};

function buildChartData(series: HeartRateSample[], config: ScoreResult["config"]): ChartPoint[] {
  const step = Math.max(1, Math.ceil(series.length / 760));
  const sampled = series.filter((_, index) => index % step === 0);
  const last = series[series.length - 1];

  if (last && sampled[sampled.length - 1]?.time !== last.time) {
    sampled.push(last);
  }

  return sampled.map((sample) => ({
    time: sample.time,
    bpm: sample.bpm,
    target:
      sample.bpm >= config.targetMin && sample.bpm <= config.targetMax
        ? sample.bpm
        : null,
    above:
      sample.bpm > config.targetMax && sample.bpm <= config.redlineThreshold
        ? sample.bpm
        : null,
    redline: sample.bpm > config.redlineThreshold ? sample.bpm : null,
    deficit: sample.bpm < config.targetMin ? sample.bpm : null,
    ego: sample.bpm > config.targetMax ? sample.bpm : null,
    label: formatDuration(sample.time),
  }));
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  const status =
    point.bpm < 125 ? "below" : point.bpm <= 135 ? "target" : "above";

  return (
    <div className="border border-signal/30 bg-black/95 px-3 py-2 font-mono shadow-[0_0_24px_rgba(0,0,0,0.8)]">
      <div className="text-[8px] uppercase tracking-[0.18em] text-white/30">
        T+ {formatDuration(point.time)}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-bold text-white">{point.bpm}</span>
        <span className="text-[8px] uppercase tracking-[0.15em] text-white/35">bpm</span>
      </div>
      <div
        className={`mt-1 text-[8px] uppercase tracking-[0.14em] ${
          status === "target"
            ? "text-signal"
            : status === "below"
              ? "text-white/45"
              : "text-blood-bright"
        }`}
      >
        {zoneLabel(status)}
      </div>
    </div>
  );
}

export function HeartRateChart({ result }: { result: ScoreResult }) {
  const data = useMemo(
    () => buildChartData(result.series, result.config),
    [result.series, result.config],
  );

  const minBpm = Math.max(80, Math.min(110, result.minBpm - 8));
  const maxBpm = Math.max(160, result.maxBpm + 8);
  const targetMin = result.config.targetMin;
  const targetMax = result.config.targetMax;
  const redline = result.config.redlineThreshold;

  const buckets = useMemo(() => {
    const count = 120;
    const size = Math.max(1, Math.ceil(result.series.length / count));
    const output: HeartRateSample["status"][] = [];

    for (let start = 0; start < result.series.length; start += size) {
      const bucket = result.series.slice(start, start + size);
      const worst = bucket.reduce((current, sample) => {
        const rank = { target: 0, below: 1, above: 2, redline: 3 } as const;
        return rank[sample.status] > rank[current] ? sample.status : current;
      }, "target" as HeartRateSample["status"]);
      output.push(worst);
    }

    return output;
  }, [result.series]);

  return (
    <div>
      <div className="h-[330px] w-full sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -18 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.055)" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={[0, result.elapsedSeconds]}
              tickFormatter={(value: number) => formatDuration(value)}
              tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 9, fontFamily: "JetBrains Mono Variable" }}
              axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              domain={[minBpm, maxBpm]}
              tickCount={8}
              tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 9, fontFamily: "JetBrains Mono Variable" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(57,255,20,0.35)", strokeDasharray: "3 3" }} />

            <ReferenceArea
              y1={targetMin}
              y2={targetMax}
              fill="#39ff14"
              fillOpacity={0.07}
              ifOverflow="extendDomain"
            />
            <ReferenceArea
              y1={targetMax}
              y2={redline}
              fill="#b30000"
              fillOpacity={0.045}
              ifOverflow="extendDomain"
            />
            <ReferenceLine
              y={redline}
              stroke="rgba(255,43,28,0.7)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              y={targetMax}
              stroke="rgba(57,255,20,0.28)"
              strokeDasharray="2 4"
              strokeWidth={1}
            />
            <ReferenceLine
              y={targetMin}
              stroke="rgba(57,255,20,0.28)"
              strokeDasharray="2 4"
              strokeWidth={1}
            />

            <Area
              type="monotone"
              dataKey="ego"
              baseValue={targetMax}
              stroke="none"
              fill="#b30000"
              fillOpacity={0.5}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="deficit"
              baseValue={targetMin}
              stroke="none"
              fill="#8b958b"
              fillOpacity={0.3}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="bpm"
              stroke="#39ff14"
              strokeOpacity={0.16}
              strokeWidth={1}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="deficit"
              stroke="#9aa29a"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="above"
              stroke="#ff5a3d"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="redline"
              stroke="#ff2b1c"
              strokeWidth={1.8}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#39ff14"
              strokeWidth={1.5}
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
              status === "redline"
                ? "bg-blood-bright"
                : status === "above"
                  ? "bg-blood"
                  : status === "below"
                    ? "bg-white/20"
                    : "bg-signal/70"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[8px] uppercase tracking-[0.13em] text-white/35">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 bg-signal" /> EN DIANA 125-135
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 bg-blood" /> EXCESO &gt;135
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 bg-white/20" /> DÉFICIT &lt;125
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-3 bg-[#ff2b1c]" /> REDLINE &gt;145
        </span>
        <span className="ml-auto hidden sm:inline">1 SAMPLE = 1 SECOND</span>
      </div>
    </div>
  );
}
