import { useEffect, useMemo, useState } from "react";
import { buildMockHeartRate } from "../lib/mockActivity";
import { CornerMarks, StatusDot } from "./Icons";

const WINDOW = 90;

function statusFor(bpm: number): {
  label: string;
  tone: "signal" | "warning" | "blood";
} {
  if (bpm < 125) return { label: "DÉFICIT", tone: "warning" };
  if (bpm <= 135) return { label: "HOLD / EN DIANA", tone: "signal" };
  if (bpm <= 145) return { label: "EXCESO", tone: "warning" };
  return { label: "REDLINE / EGO", tone: "blood" };
}

export function LandingTelemetry() {
  const heartrate = useMemo(() => buildMockHeartRate(), []);
  const [cursor, setCursor] = useState(952);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCursor((current) => (current + 1) % (heartrate.length - WINDOW - 1));
    }, 110);

    return () => window.clearInterval(timer);
  }, [heartrate.length]);

  const windowData = heartrate.slice(cursor, cursor + WINDOW);
  const current = windowData[windowData.length - 1] ?? 130;
  const status = statusFor(current);
  const delta = current - 130;

  const points = windowData
    .map((bpm, index) => {
      const x = (index / (WINDOW - 1)) * 300;
      const y = 92 - ((bpm - 100) / 60) * 80;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastX = 300;
  const lastY = 92 - ((current - 100) / 60) * 80;
  const bandTop = 92 - ((135 - 100) / 60) * 80;
  const bandBottom = 92 - ((125 - 100) / 60) * 80;

  return (
    <div className="relative w-full border border-white/10 bg-[#080908]/90">
      <CornerMarks />
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <StatusDot tone="signal" pulse />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
            Live feed / MOCK-042
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/25">
          <span>1Hz</span>
          <span className="h-3 w-px bg-white/15" />
          <span>CH-01</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-4 px-4 pb-4 pt-5 sm:px-5">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/30">
            Heart rate / bpm
          </div>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-mono text-[56px] font-bold leading-[0.85] tracking-[-0.06em] text-white sm:text-[68px]">
              {current}
            </span>
            <span className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
              BPM
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
              status.tone === "signal"
                ? "text-signal"
                : status.tone === "blood"
                  ? "text-blood-bright"
                  : "text-warning"
            }`}
          >
            {status.label}
          </div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">
            DELTA {delta >= 0 ? "+" : ""}
            {delta} BPM
          </div>
        </div>
      </div>

      <div className="relative mx-4 mb-4 border border-white/[0.07] bg-black/60 sm:mx-5">
        <div className="absolute left-0 top-0 z-10 flex gap-3 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
          <span>TARGET 125-135</span>
          <span className="text-blood-bright/50">+145</span>
        </div>
        <svg
          viewBox="0 0 300 100"
          preserveAspectRatio="none"
          className="block h-[132px] w-full"
          role="img"
          aria-label={`Telemetría cardíaca de muestra: ${current} bpm`}
        >
          <defs>
            <linearGradient id="telemetry-glow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#39ff14" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#39ff14" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3, 4].map((line) => (
            <line
              key={line}
              x1="0"
              x2="300"
              y1={16 + line * 18}
              y2={16 + line * 18}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.6"
            />
          ))}

          <rect
            x="0"
            y={bandTop}
            width="300"
            height={bandBottom - bandTop}
            fill="rgba(57,255,20,0.08)"
          />
          <line
            x1="0"
            x2="300"
            y1={92 - ((145 - 100) / 60) * 80}
            y2={92 - ((145 - 100) / 60) * 80}
            stroke="rgba(255,43,28,0.35)"
            strokeWidth="0.7"
            strokeDasharray="3 3"
          />

          <polygon
            points={`0,100 ${points} 300,100`}
            fill="url(#telemetry-glow)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="#39ff14"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          <circle cx={lastX} cy={lastY} r="2.2" fill="#39ff14" />
          <circle cx={lastX} cy={lastY} r="5" fill="none" stroke="#39ff14" strokeOpacity="0.35" />
        </svg>
      </div>

      <div className="grid grid-cols-2 border-t border-white/10 font-mono text-[8px] uppercase tracking-[0.13em] sm:grid-cols-4">
        {[
          ["Source", "MOCK-042"],
          ["Zone", "ZONA 02"],
          ["Alert", status.tone === "blood" ? "EGO" : "NONE"],
          ["Score est.", "850 / 1K"],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`px-3 py-3 ${
              index > 0 ? "border-l border-white/[0.06]" : ""
            } ${index > 1 ? "border-t border-white/[0.06] sm:border-t-0" : ""}`}
          >
            <div className="text-white/25">{label}</div>
            <div
              className={`mt-1 ${
                value === "EGO" ? "text-blood-bright" : "text-white/70"
              }`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
