import {
  Activity,
  ArrowUpRight,
  Database,
  Radio,
  RotateCw,
  ShieldAlert,
  Timer,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TerminalButton } from "../components/Buttons";
import {
  BracketLabel,
  CornerMarks,
  StatusDot,
  StravaMark,
} from "../components/Icons";
import { TargetGauge } from "../components/TargetGauge";
import { useRun } from "../context/RunContext";
import { formatDate, formatDistance, formatDuration } from "../lib/format";
import { MISSION_01, MOCK_ACTIVITY_ID } from "../lib/mockActivity";
import { isSupabaseConfigured } from "../lib/supabase";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

function todayLabel(): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();
}

export function DashboardPage() {
  const { run, isSyncing, error, connected, syncActivity } = useRun();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [localSyncing, setLocalSyncing] = useState(false);
  const busy = localSyncing || isSyncing;

  const handleSync = async () => {
    if (busy) return;

    setLocalSyncing(true);
    setLogs(["> ctrl-run sync --source=strava --latest"]);

    try {
      await sleep(260);
      setLogs((current) => [
        ...current,
        "> oauth.scope ......... activity:read_all ✓",
        "> GET /athlete/activities ......... 1 MATCH",
      ]);
      await sleep(420);
      setLogs((current) => [
        ...current,
        "> GET /activities/{id}/streams ... HR @ 1HZ",
        "> audit.engine.run ............... LOCKED",
      ]);

      const stored = await syncActivity();

      setLogs((current) => [
        ...current,
        `> score.engine ................... ${stored.result.score}/1000`,
        stored.result.egoAlert
          ? "> discipline.alert ............... EGO DESBOCADO"
          : "> discipline.alert ............... NONE",
      ]);

      await sleep(560);
      setLocalSyncing(false);
      navigate("/arbitro");
    } catch {
      setLogs((current) => [
        ...current,
        "> ERROR: no se pudo leer el stream. Reintentá.",
      ]);
      setLocalSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <BracketLabel>PANEL DE CONTROL</BracketLabel>
            <span className="h-3 w-px bg-white/15" />
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/25">
              {todayLabel()} / SESSION_042
            </span>
          </div>
          <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.6rem)] font-bold uppercase leading-[0.9] tracking-[-0.055em]">
            Una misión.
            <span className="text-white/35"> Cero negociación.</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.15em] text-white/35 sm:flex">
            <StatusDot tone={connected ? "signal" : "warning"} pulse />
            {connected ? "STRAVA // LINKED" : "STRAVA // DEMO"}
          </div>
          <div className="font-mono text-right text-[8px] uppercase tracking-[0.15em] text-white/25">
            <div>LAT -34.6037</div>
            <div>LON -58.3816</div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="relative border border-signal/20 bg-[#080a08]">
          <CornerMarks />
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-signal">
                MISIÓN 01:
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                El Monje
              </span>
            </div>
            <div className="flex items-center gap-3">
              <BracketLabel className="hidden sm:inline">ZONA 2</BracketLabel>
              <span className="flex items-center gap-2 border border-signal/25 bg-signal/[0.05] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.15em] text-signal/80">
                <StatusDot tone="signal" pulse /> ARMED
              </span>
            </div>
          </div>

          <div className="relative px-5 py-7 sm:px-8 sm:py-9">
            <div className="pointer-events-none absolute right-5 top-5 hidden text-right font-mono text-[7px] uppercase leading-relaxed tracking-[0.16em] text-white/15 sm:block">
              <div>[PROTOCOL: HR_HOLD]</div>
              <div>[ENGINE: 1HZ]</div>
              <div>[TOLERANCE: 0]</div>
            </div>

            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30">
              OBJETIVO
            </div>
            <p className="mt-2 max-w-xl text-lg leading-snug text-white/75 sm:text-xl">
              40 minutos. Target estricto: entre 125 y 135 bpm
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="font-mono text-[clamp(3.2rem,8vw,5.8rem)] font-bold leading-[0.8] tracking-[-0.08em] text-signal">
                125
              </span>
              <span className="mb-2 font-mono text-2xl font-bold text-white/25">—</span>
              <span className="font-mono text-[clamp(3.2rem,8vw,5.8rem)] font-bold leading-[0.8] tracking-[-0.08em] text-signal">
                135
              </span>
              <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                BPM
              </span>
            </div>

            <div className="mt-8 max-w-2xl">
              <TargetGauge />
            </div>

            <div className="mt-7 grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
              {[
                { icon: Timer, label: "DURACIÓN", value: "40:00" },
                { icon: ShieldAlert, label: "REDLINE", value: ">145 BPM" },
                { icon: Waves, label: "BASE SCORE", value: "1000 PTS" },
              ].map((item) => (
                <div key={item.label} className="bg-[#080a08] px-4 py-3.5">
                  <div className="flex items-center gap-2 font-mono text-[7.5px] uppercase tracking-[0.16em] text-white/25">
                    <item.icon className="h-3 w-3 text-signal/50" />
                    {item.label}
                  </div>
                  <div className="mt-2 font-mono text-sm uppercase tracking-[0.06em] text-white/75">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-3 font-mono text-[7.5px] uppercase tracking-[0.16em] text-white/20">
            <span>TARGET: 125—135 / EGO PENALTY: 2X</span>
            <span>MISSION_ID: {MISSION_01.id}</span>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="relative border border-white/10 bg-[#080908]">
            <CornerMarks tone="neutral" />
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
                ENLACE / STRAVA
              </span>
              <StatusDot tone={connected ? "signal" : "warning"} />
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/[0.02]">
                  <StravaMark className="h-4 w-4 text-[#fc4c02]" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/75">
                    {connected ? "Cuenta enlazada" : "Modo simulación"}
                  </div>
                  <div className="mt-0.5 font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/25">
                    SINGLE-PLAYER / FASE 1
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-px bg-white/[0.07]">
                <div className="bg-[#080908] px-3 py-2.5">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    FEED
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-white/60">
                    {MOCK_ACTIVITY_ID.slice(0, 18)}
                  </div>
                </div>
                <div className="bg-[#080908] px-3 py-2.5">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    RESOLUCIÓN
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-signal/70">
                    1 HZ
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="relative border border-white/10 bg-[#080908]">
            <CornerMarks tone="neutral" />
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
                ESTADO / HOY
              </span>
              <span className="font-mono text-[7.5px] tracking-[0.12em] text-white/20">
                {run ? "AUDITADO" : "IDLE"}
              </span>
            </div>

            <div className="px-4 py-5">
              <div className="flex items-start gap-3 border border-white/[0.07] bg-black/40 px-3 py-3">
                <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal/60" />
                <div>
                  <div className="terminal-cursor font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-white/55">
                    {run
                      ? "Última actividad auditada."
                      : "Esperando actividad de hoy de Strava..."}
                  </div>
                  <div className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    {run
                      ? "SESIÓN CERRADA / LISTA PARA RE-AUDITAR"
                      : "POLLING ACTIVO / MOCK FEED READY"}
                  </div>
                </div>
              </div>

              {run && (
                <div className="mt-3 flex items-center justify-between gap-3 border border-signal/15 bg-signal/[0.03] px-3 py-2.5">
                  <div>
                    <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/25">
                      ÚLTIMA AUDITORÍA
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-white/65">
                      {formatDate(run.activity.startedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold leading-none text-signal">
                      {run.result.score}
                    </div>
                    <Link
                      to="/arbitro"
                      className="mt-1 flex items-center gap-1 font-mono text-[7px] uppercase tracking-[0.12em] text-signal/60 hover:text-signal"
                    >
                      VER <ArrowUpRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <TerminalButton
                  variant="solid"
                  onClick={handleSync}
                  loading={busy}
                  icon={<RotateCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />}
                  className="w-full"
                >
                  {busy ? "Auditando stream..." : "Sincronizar última actividad"}
                </TerminalButton>
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[7px] uppercase tracking-[0.13em] text-white/20">
                <span className="flex items-center gap-1.5">
                  <Database className="h-2.5 w-2.5" />
                  {isSupabaseConfigured ? "SUPABASE // REMOTE" : "MOCK // LOCAL"}
                </span>
                <span>MANUAL SYNC</span>
              </div>
            </div>

            {(logs.length > 0 || error) && (
              <div className="border-t border-white/[0.08] bg-black px-4 py-3 font-mono text-[8px] leading-relaxed">
                {logs.map((line, index) => (
                  <div key={`${line}-${index}`} className="text-white/35">
                    {line}
                  </div>
                ))}
                {error && (
                  <div className="mt-1 text-blood-bright">
                    &gt; SYSTEM_ERROR: {error}
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      <section className="mt-5 border border-white/[0.08] bg-[#080908]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3">
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
            PROTOCOLO DE EVALUACIÓN / 1HZ
          </span>
          <span className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/20">
            ENGINE READY
          </span>
        </div>
        <div className="grid gap-px bg-white/[0.07] sm:grid-cols-3">
          {[
            {
              tag: "01 / HOLD",
              title: "En la diana",
              value: "0 PTS",
              text: "125—135 bpm. Silencio. El motor hace su trabajo.",
              accent: "text-signal",
            },
            {
              tag: "02 / EGO",
              title: "Sobre la diana",
              value: "-2 PTS/S",
              text: "Cada segundo por encima de 135 bpm es una fuga de control.",
              accent: "text-blood-bright",
            },
            {
              tag: "03 / DÉFICIT",
              title: "Bajo la diana",
              value: "-1 PT/S",
              text: "Cada segundo por debajo de 125 bpm también deja marca.",
              accent: "text-white/55",
            },
          ].map((item) => (
            <div key={item.tag} className="bg-[#080908] p-5">
              <div className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-white/20">
                {item.tag}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-semibold uppercase tracking-[-0.02em] text-white/75">
                  {item.title}
                </h2>
                <span className={`font-mono text-[10px] ${item.accent}`}>{item.value}</span>
              </div>
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-[12px] leading-relaxed text-white/30">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-white/[0.08] bg-black/30 px-4 py-3.5 font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/25">
        <span className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-signal/50" />
          MOCK ACTIVITY: 7.42 KM / 40:00 / GARMIN FORERUNNER 965
        </span>
        <span className="flex items-center gap-3">
          <span>STREAM: {MOCK_ACTIVITY_ID}</span>
          <span className="text-white/10">//</span>
          <span>{formatDuration(MISSION_01.durationMinutes * 60)}</span>
          <span>{formatDistance(7420)}</span>
        </span>
      </section>
    </div>
  );
}
