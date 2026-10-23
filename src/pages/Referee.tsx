import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Crosshair,
  Gauge,
  ShieldAlert,
  Timer,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeartRateChart } from "../components/HeartRateChart";
import { ScoreDisplay, ScoreMeter } from "../components/ScoreDisplay";
import { TerminalButton } from "../components/Buttons";
import {
  BracketLabel,
  CornerMarks,
  StatusDot,
} from "../components/Icons";
import { useRun } from "../context/RunContext";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPercent,
  verdictBorderClass,
  verdictToneClass,
} from "../lib/format";
import { getVerdict } from "../lib/scoring";
import type { StoredRun } from "../lib/types";

function EmptyAudit() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-[62vh] max-w-[1480px] items-center px-4 py-14 sm:px-6 lg:px-10">
      <div className="relative w-full border border-white/10 bg-[#080908] p-6 sm:p-10">
        <CornerMarks tone="neutral" />
        <div className="flex items-center gap-2">
          <StatusDot tone="warning" />
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
            NO_STREAM / SIN AUDITORÍA
          </span>
        </div>
        <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] font-bold uppercase leading-[0.88] tracking-[-0.06em]">
          Todavía no hay
          <span className="block text-white/30">pulso que juzgar.</span>
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/40">
          El árbitro necesita una serie temporal de frecuencia cardíaca. Volvé al
          panel y sincronizá la última actividad para abrir el expediente.
        </p>
        <div className="mt-7">
          <TerminalButton
            variant="solid"
            onClick={() => navigate("/panel")}
            trailing={<ArrowUpRight className="h-3.5 w-3.5" />}
          >
            Ir al panel
          </TerminalButton>
        </div>
        <div className="mt-8 border-t border-white/[0.06] pt-4 font-mono text-[8px] uppercase leading-relaxed tracking-[0.14em] text-white/20">
          &gt; expected: POST /sync --latest
          <br />
          &gt; required: time[], heartrate[] @ 1Hz
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "signal" | "blood" | "warning";
}) {
  const valueColor = {
    default: "text-white/80",
    signal: "text-signal",
    blood: "text-blood-bright",
    warning: "text-warning",
  };

  return (
    <div className="bg-[#080908] px-4 py-4">
      <div className="flex items-center gap-2 font-mono text-[7.5px] uppercase tracking-[0.16em] text-white/25">
        <Icon className="h-3 w-3 text-white/25" />
        {label}
      </div>
      <div className={`mt-3 font-mono text-2xl font-bold tracking-[-0.04em] ${valueColor[tone]}`}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.13em] text-white/20">
        {detail}
      </div>
    </div>
  );
}

function AuditResult({ run }: { run: StoredRun }) {
  const navigate = useNavigate();
  const { result, activity } = run;
  const verdict = getVerdict(result.score);
  const egoPoints = result.aboveSeconds * result.config.abovePenalty;
  const deficitPoints = result.belowSeconds * result.config.belowPenalty;
  const breaches = [...result.breaches].sort((a, b) => a.start - b.start);
  const maxPenalty = Math.max(egoPoints, deficitPoints, 1);

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <BracketLabel>AUDITORÍA COMPLETA</BracketLabel>
          <span className="h-3 w-px bg-white/15" />
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
            {activity.name}
          </span>
          <span className="hidden font-mono text-[8px] uppercase tracking-[0.16em] text-white/15 sm:inline">
            / {activity.id}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">
          <span className="flex items-center gap-2">
            <StatusDot tone={result.egoAlert ? "blood" : "signal"} />
            {result.egoAlert ? "DISCIPLINE_BREACH" : "STREAM_VALID"}
          </span>
          <span className="hidden sm:inline">/ {formatDate(run.syncedAt)}</span>
        </div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section
          className={`relative border bg-[#080908] p-6 sm:p-8 ${verdictBorderClass[verdict.tone]}`}
        >
          <CornerMarks tone={verdict.tone === "blood" ? "blood" : "signal"} />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30">
              VEREDICTO DEL ÁRBITRO
            </span>
            <span className={`font-mono text-[8px] uppercase tracking-[0.16em] ${verdictToneClass[verdict.tone]}`}>
              [{verdict.label}]
            </span>
          </div>

          <h1 className={`mt-6 font-display text-[clamp(2.4rem,5.5vw,4.8rem)] font-bold uppercase leading-[0.86] tracking-[-0.06em] ${verdictToneClass[verdict.tone]}`}>
            {verdict.label}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65 sm:text-xl">
            {verdict.text}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.08] pt-4 font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">
            <span className="flex items-center gap-2">
              <Crosshair className="h-3 w-3 text-signal/60" />
              TARGET 125—135 BPM
            </span>
            <span>EN DIANA {formatPercent(result.targetPercent)}</span>
            <span>DELTA {result.pointsLost} PTS</span>
            <span className="ml-auto hidden sm:inline">
              AUDIT_ID / {activity.id.slice(-6).toUpperCase()}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <ScoreDisplay result={result} />
          <div className="flex items-center justify-between border border-white/10 bg-[#080908] px-4 py-3 font-mono text-[7.5px] uppercase tracking-[0.15em] text-white/25">
            <span className="flex items-center gap-2">
              <Waves className="h-3 w-3 text-signal/60" />
              {result.elapsedSeconds} SAMPLES
            </span>
            <span>{formatDuration(result.elapsedSeconds)}</span>
          </div>
        </section>
      </div>

      {result.egoAlert && (
        <section className="relative mt-5 border border-blood-bright/45 bg-blood/[0.09] px-5 py-5">
          <CornerMarks tone="blood" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-blood-bright" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-blood-bright/70">
                  ALERTA CRÍTICA / REDLINE
                </div>
                <h2 className="mt-1 font-display text-xl font-semibold uppercase tracking-[-0.02em] text-blood-bright sm:text-2xl">
                  Fallo de disciplina (Ego desbocado)
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-white/45">
                  Superaste los 145 bpm durante más de 30 segundos. El motor fue
                  a la galería, no al objetivo.
                </p>
              </div>
            </div>
            <div className="flex w-fit shrink-0 gap-px self-start bg-white/10 sm:self-auto">
              <div className="bg-[#120505] px-4 py-3 text-center">
                <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/25">
                  REDLINE
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-blood-bright">
                  {formatDuration(result.longestRedline)}
                </div>
              </div>
              <div className="bg-[#120505] px-4 py-3 text-center">
                <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/25">
                  INICIO
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-blood-bright">
                  T+{formatDuration(result.redlineStart ?? 0)}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-5 border border-white/10 bg-[#080908]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <BracketLabel>STREAM / HEART.RATE</BracketLabel>
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/20">
              1 SAMPLE = 1 SECOND
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/25">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-signal" /> CONTROL
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-blood-bright" /> EGO
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-white/30" /> DÉFICIT
            </span>
          </div>
        </div>
        <div className="px-2 py-4 sm:px-4">
          <HeartRateChart result={result} />
        </div>
      </section>

      <section className="mt-5 grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric
          icon={Crosshair}
          label="TIEMPO EN DIANA"
          value={formatPercent(result.targetPercent)}
          detail={`${result.targetSeconds} SEG`}
          tone="signal"
        />
        <Metric
          icon={Gauge}
          label="PULSO MEDIO"
          value={`${result.averageBpm}`}
          detail="BPM"
        />
        <Metric
          icon={Activity}
          label="PULSO MÁXIMO"
          value={`${result.maxBpm}`}
          detail="BPM"
        />
        <Metric
          icon={ShieldAlert}
          label="SOBREESFUERZO"
          value={`${result.aboveSeconds}`}
          detail="SEG / EGO"
          tone="blood"
        />
        <Metric
          icon={Timer}
          label="DÉFICIT"
          value={`${result.belowSeconds}`}
          detail="SEG / BAJO DIANA"
          tone="warning"
        />
        <Metric
          icon={Waves}
          label="PUNTOS PERDIDOS"
          value={`${result.pointsLost}`}
          detail={`DE ${result.config.startingScore}`}
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.65fr_1.35fr]">
        <section className="relative border border-white/10 bg-[#080908]">
          <CornerMarks tone="neutral" />
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
              DESGLOSE / PENALIZACIÓN
            </span>
            <span className="font-mono text-[7.5px] text-white/20">
              -{result.pointsLost}
            </span>
          </div>
          <div className="space-y-5 px-4 py-5">
            <div>
              <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.12em]">
                <span className="text-blood-bright/80">Ego / &gt;135</span>
                <span className="text-white/50">-{egoPoints} PTS</span>
              </div>
              <div className="mt-2 h-2 bg-white/[0.06]">
                <div
                  className="h-full bg-blood-bright"
                  style={{ width: `${(egoPoints / maxPenalty) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">
                {result.aboveSeconds} SEG × -{result.config.abovePenalty}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.12em]">
                <span className="text-white/45">Déficit / &lt;125</span>
                <span className="text-white/50">-{deficitPoints} PTS</span>
              </div>
              <div className="mt-2 h-2 bg-white/[0.06]">
                <div
                  className="h-full bg-white/30"
                  style={{ width: `${(deficitPoints / maxPenalty) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">
                {result.belowSeconds} SEG × -{result.config.belowPenalty}
              </div>
            </div>

            <div className="border-t border-white/[0.08] pt-4">
              <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.14em]">
                <span className="text-white/30">Score final</span>
                <span className={verdictToneClass[verdict.tone]}>
                  {result.score} / 1000
                </span>
              </div>
              <div className="mt-3">
                <ScoreMeter score={result.score} />
              </div>
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-[#080908]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
              REGISTRO DE FUGAS / {breaches.length} WINDOWS
            </span>
            <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-white/20">
              1HZ
            </span>
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            {breaches.length === 0 ? (
              <div className="px-4 py-10 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-signal/60">
                Sin ventanas fuera de la diana. Control perfecto.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {breaches.map((breach, index) => (
                  <div
                    key={`${breach.kind}-${breach.start}-${index}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={`mt-0.5 h-3 w-px ${
                        breach.kind === "ego"
                          ? breach.critical
                            ? "bg-blood-bright"
                            : "bg-blood"
                          : "bg-white/25"
                      }`}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono text-[8px] uppercase tracking-[0.14em] ${
                            breach.kind === "ego"
                              ? "text-blood-bright/80"
                              : "text-white/45"
                          }`}
                        >
                          {breach.kind === "ego" ? "EXCESO DE EGO" : "DÉFICIT"}
                        </span>
                        {breach.critical && (
                          <span className="border border-blood-bright/40 px-1.5 py-0.5 font-mono text-[6.5px] uppercase tracking-[0.12em] text-blood-bright">
                            REDLINE
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-white/25">
                        T+{formatDuration(breach.start)} → T+
                        {formatDuration(breach.end)} / PICO {breach.peak} BPM
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-white/60">
                        {formatDuration(breach.duration)}
                      </div>
                      <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/20">
                        -{breach.pointsLost} PTS
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-3 font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">
            <span>FUENTE: {run.origin.toUpperCase()} / {activity.deviceName}</span>
            <span>{formatDistance(activity.distance)} / 1HZ</span>
          </div>
        </section>
      </div>

      <section className="mt-5 flex flex-col gap-5 border border-white/10 bg-black/30 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="font-mono text-[8px] uppercase leading-relaxed tracking-[0.14em] text-white/25">
          <div>
            ACTIVIDAD: {activity.name} / {formatDate(activity.startedAt)}
          </div>
          <div className="mt-1">
            {formatDistance(activity.distance)} / {formatDuration(activity.elapsedTime)} /
            MEDIA {activity.averageHeartrate} BPM / MAX {activity.maxHeartrate} BPM
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <TerminalButton
            variant="outline"
            onClick={() => navigate("/")}
            icon={<ArrowLeft className="h-3.5 w-3.5" />}
          >
            Inicio
          </TerminalButton>
          <TerminalButton
            variant="solid"
            onClick={() => navigate("/panel")}
            trailing={<ArrowUpRight className="h-3.5 w-3.5" />}
          >
            Sincronizar otra
          </TerminalButton>
        </div>
      </section>
    </div>
  );
}

export function RefereePage() {
  const { run } = useRun();

  if (!run) {
    return <EmptyAudit />;
  }

  return <AuditResult run={run} />;
}
