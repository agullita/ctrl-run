import {
  Activity,
  ArrowUpRight,
  Database,
  FileUp,
  HeartPulse,
  Pencil,
  Radio,
  RotateCw,
  ShieldAlert,
  SlidersHorizontal,
  Timer,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { TerminalButton } from "../components/Buttons";
import {
  BracketLabel,
  CornerMarks,
  StatusDot,
  SuuntoMark,
} from "../components/Icons";
import { TargetGauge } from "../components/TargetGauge";
import { useRun } from "../context/RunContext";
import {
  formatBpm,
  formatDate,
  formatDistance,
  formatDuration,
} from "../lib/format";
import { MISSION_01, MOCK_ACTIVITY_ID } from "../lib/mockActivity";
import { isSupabaseConfigured } from "../lib/supabase";
import { SUUNTO_DEMO_MODE } from "../lib/suunto";
import { ZONE_DEFINITIONS, getZoneDefinition, isProfileComplete } from "../lib/zones";
import type { ZoneKey } from "../lib/types";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const ZONE_KEY = "ctrlrun:mission-zone";

function todayLabel(): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();
}

function readZone(): ZoneKey {
  try {
    const raw = localStorage.getItem(ZONE_KEY);
    return ZONE_DEFINITIONS.some((zone) => zone.key === raw)
      ? (raw as ZoneKey)
      : "z2";
  } catch {
    return "z2";
  }
}

function LoadingProfile() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[1480px] items-center px-4 py-14 sm:px-6 lg:px-10">
      <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
        <StatusDot tone="warning" pulse />
        Cargando perfil fisiológico...
      </div>
    </div>
  );
}

export function DashboardPage() {
  const {
    run,
    profile,
    profileReady,
    isSyncing,
    error,
    connected,
    suuntoUsername,
    demoMode,
    syncActivity,
    connect,
    disconnect,
  } = useRun();
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<ZoneKey>(readZone);
  const [logs, setLogs] = useState<string[]>([]);
  const [localSyncing, setLocalSyncing] = useState(false);
  const busy = localSyncing || isSyncing;

  useEffect(() => {
    if (profileReady && !profile.zones[selectedZone]) {
      setSelectedZone("z2");
      return;
    }

    try {
      localStorage.setItem(ZONE_KEY, selectedZone);
    } catch {
      return;
    }
  }, [profile.zones, profileReady, selectedZone]);

  if (!profileReady) return <LoadingProfile />;
  if (!isProfileComplete(profile)) return <Navigate to="/onboarding" replace />;

  const activeZoneKey: ZoneKey = profile.zones[selectedZone] ? selectedZone : "z2";
  const zone = profile.zones[activeZoneKey];
  if (!zone) return <Navigate to="/onboarding" replace />;

  const zoneDefinition = getZoneDefinition(activeZoneKey);
  const sweetSpot = (zone.min + zone.max) / 2;
  const sweetMin = sweetSpot - 2;
  const sweetMax = sweetSpot + 2;

  const handleSync = async () => {
    if (busy) return;

    setLocalSyncing(true);
    setLogs(["> ctrl-run sync --source=suunto --latest"]);

    try {
      await sleep(240);
      setLogs((current) => [
        ...current,
        "> oauth.scope ................... workout V",
        "> GET /v3/workouts .............. 1 MATCH",
      ]);
      await sleep(380);
      setLogs((current) => [
        ...current,
        "> GET /v3/workouts/{key} ........ HEARTRATE STREAM",
        "> precision.engine.run .......... LOCKED",
      ]);

      const stored = await syncActivity(activeZoneKey);

      setLogs((current) => [
        ...current,
        `> mission.zone .................. ${activeZoneKey.toUpperCase()} / ${zone.min}-${zone.max}`,
        `> precision.score ............... ${String(stored.result.score1000).padStart(4, "0")} / 1000`,
        stored.result.egoAlert
          ? "> discipline.alert ............. EGO SOSTENIDO"
          : "> discipline.alert ............. NONE",
      ]);

      await sleep(560);
      setLocalSyncing(false);
      navigate("/arbitro");
    } catch {
      setLogs((current) => [
        ...current,
        "> ERROR: no se pudo leer Suunto. Fallback demo activado.",
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
            {connected ? "SUUNTO // LINKED" : "SUUNTO // DEMO"}
          </div>
          <div className="font-mono text-right text-[8px] uppercase tracking-[0.15em] text-white/25">
            {profile.calibrationMethod === "manual" ? (
              <>
                <div>MODO MANUAL</div>
                <div>Z2 {profile.zones.z2?.min}-{profile.zones.z2?.max}</div>
              </>
            ) : (
              <>
                <div>FCM {profile.hrMax}</div>
                <div>FCR {profile.hrRest}</div>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="relative mt-7 border border-white/10 bg-[#080908]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
            <SlidersHorizontal className="h-3 w-3 text-signal/60" />
            OBJETIVO / SELECTOR DE MISIÓN
          </div>
          <span className="font-mono text-[7px] uppercase tracking-[0.13em] text-white/20">
            Se aplica a la próxima auditoría
          </span>
        </div>
        <div className="grid gap-px bg-white/[0.07] sm:grid-cols-5">
          {ZONE_DEFINITIONS.map((definition) => {
            const range = profile.zones[definition.key];
            const active = definition.key === activeZoneKey;
            return (
              <button
                key={definition.key}
                type="button"
                onClick={() => setSelectedZone(definition.key)}
                disabled={!range}
                className={`bg-[#080908] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.025] disabled:cursor-not-allowed disabled:opacity-35 ${
                  active ? "shadow-[inset_0_2px_0_#39ff14]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
                      active ? "text-signal" : "text-white/35"
                    }`}
                  >
                    [{definition.key}]
                  </span>
                  {active && <StatusDot tone="signal" />}
                </div>
                <div className={`mt-1 font-display text-sm ${active ? "text-white" : "text-white/55"}`}>
                  {definition.label}
                </div>
                <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.1em] text-white/22">
                  {range ? `${range.min}—${range.max} BPM` : "SIN DATOS"}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr] xl:items-start">
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
              <BracketLabel className="hidden sm:inline">
                {activeZoneKey.toUpperCase()} / {zoneDefinition.label}
              </BracketLabel>
              <span className="flex items-center gap-2 border border-signal/25 bg-signal/[0.05] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.15em] text-signal/80">
                <StatusDot tone="signal" pulse /> ARMED
              </span>
            </div>
          </div>

          <div className="relative px-5 py-7 sm:px-8 sm:py-9">
            <div className="pointer-events-none absolute right-5 top-5 hidden text-right font-mono text-[7px] uppercase leading-relaxed tracking-[0.16em] text-white/15 sm:block">
              <div>[PROTOCOL: PRECISION_HOLD]</div>
              <div>[ENGINE: SWEET_BAND]</div>
              <div>[BASE: 1000 PTS]</div>
            </div>

            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30">
              OBJETIVO DINÁMICO
            </div>
            <p className="mt-2 max-w-xl text-lg leading-snug text-white/75 sm:text-xl">
              45 minutos. {zoneDefinition.label} entre {zone.min} y {zone.max} bpm.
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="font-mono text-[clamp(3.2rem,8vw,5.8rem)] font-bold leading-[0.8] tracking-[-0.08em] text-signal">
                {zone.min}
              </span>
              <span className="mb-2 font-mono text-2xl font-bold text-white/25">-</span>
              <span className="font-mono text-[clamp(3.2rem,8vw,5.8rem)] font-bold leading-[0.8] tracking-[-0.08em] text-signal">
                {zone.max}
              </span>
              <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                BPM
              </span>
              <div className="mb-1 ml-auto border border-white/10 bg-black/40 px-3 py-2">
                <div className="font-mono text-[7px] uppercase tracking-[0.16em] text-white/25">
                  SWEET BAND
                </div>
                <div className="mt-1 font-mono text-lg font-bold leading-none text-white">
                  {formatBpm(sweetMin)}—{formatBpm(sweetMax)} BPM
                </div>
              </div>
            </div>

            <div className="mt-9 max-w-2xl">
              <TargetGauge zone={zone} zoneKey={activeZoneKey} current={sweetSpot} />
            </div>

            <div className="mt-7 grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-4">
              {[
                { icon: Timer, label: "DURACIÓN", value: "45:00" },
                { icon: SlidersHorizontal, label: "SWEET BAND", value: `${formatBpm(sweetMin)}-${formatBpm(sweetMax)}` },
                { icon: Waves, label: "BASE SCORE", value: "1000 PTS" },
                { icon: ShieldAlert, label: "MÁX / SEG", value: "+10 PTS" },
              ].map((item) => (
                <div key={item.label} className="bg-[#080a08] px-3 py-3.5">
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
            <span>
              {activeZoneKey.toUpperCase()}: {zone.min}-{zone.max} / SWEET: {formatBpm(sweetMin)}-{formatBpm(sweetMax)} / GRACE 15S
            </span>
            <span>MISSION_ID: {MISSION_01.id}</span>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="relative border border-signal/20 bg-[#080a08]">
            <CornerMarks />
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
                <HeartPulse className="h-3 w-3 text-blood-bright/70" />
                PERFIL / FISIOLOGÍA
              </div>
              <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">
                {profile.remote ? "SUPABASE" : "LOCAL"}
              </span>
            </div>
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center justify-between border border-white/[0.06] px-2.5 py-2 font-mono text-[7px] uppercase tracking-[0.11em]">
                <span className="text-white/22">Método</span>
                <span className={profile.calibrationMethod === "manual" ? "text-warning/75" : "text-signal/70"}>
                  {profile.calibrationMethod === "manual" ? "Manual / LTHR" : "Karvonen / auto"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-white/[0.07]">
                <div className="bg-[#080a08] px-3 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/22">
                    FCM
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-white/85">
                    {profile.hrMax ?? "—"}
                  </div>
                </div>
                <div className="bg-[#080a08] px-3 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/22">
                    FCR
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-signal">
                    {profile.hrRest ?? "—"}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {ZONE_DEFINITIONS.map((definition) => {
                  const range = profile.zones[definition.key];
                  return (
                    <div
                      key={definition.key}
                      className="flex items-center justify-between border border-white/[0.06] px-2.5 py-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em]"
                    >
                      <span className={definition.key === activeZoneKey ? "text-signal" : "text-white/30"}>
                        {definition.key} / {definition.label}
                      </span>
                      <span className="text-white/55">
                        {range ? `${range.min}—${range.max}` : "---"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Link
                to="/onboarding"
                className="mt-3 flex items-center justify-between border border-white/12 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-white/40 transition-colors hover:border-signal/40 hover:text-signal"
              >
                Recalibrar perfil
                <Pencil className="h-3 w-3" />
              </Link>
            </div>
          </section>

          <section className="relative border border-white/10 bg-[#080908]">
            <CornerMarks tone="neutral" />
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
                ENLACE / SUUNTO
              </span>
              <StatusDot tone={connected ? "signal" : "warning"} />
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/[0.02]">
                  <SuuntoMark className="h-5 w-5 text-signal" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/75">
                    {connected ? "Cuenta enlazada" : "Sin conexión real"}
                  </div>
                  <div className="mt-0.5 font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/25">
                    {suuntoUsername
                      ? `@${suuntoUsername}`
                      : demoMode
                        ? "DEMO / SINGLE-PLAYER"
                        : "SUUNTO CLOUD API"}
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

              {!connected && (
                <TerminalButton
                  variant="outline"
                  onClick={() => connect()}
                  icon={<SuuntoMark className="h-3.5 w-3.5" />}
                  className="mt-3 w-full"
                >
                  Conectar Suunto
                </TerminalButton>
              )}
              {connected && !demoMode && (
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="mt-3 font-mono text-[7px] uppercase tracking-[0.13em] text-white/25 underline decoration-white/15 underline-offset-4 hover:text-blood-bright"
                >
                  Revocar conexión
                </button>
              )}
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
                      : "Esperando actividad de hoy de Suunto..."}
                  </div>
                  <div className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    {run
                      ? "SESIÓN CERRADA / LISTA PARA RE-AUDITAR"
                      : "POLLING ACTIVO / DEMO FEED READY"}
                  </div>
                </div>
              </div>

              {run && (
                <div className="mt-3 flex items-center justify-between gap-3 border border-signal/15 bg-signal/[0.03] px-3 py-2.5">
                  <div>
                    <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/25">
                      ÚLTIMA AUDITORÍA / {run.result.config.zoneKey.toUpperCase()}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-white/65">
                      {formatDate(run.activity.startedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold leading-none text-signal">
                      {String(run.result.score1000).padStart(4, "0")}
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
                <span>{SUUNTO_DEMO_MODE ? "DEMO SYNC" : "SUUNTO SYNC"}</span>
              </div>

              <Link
                to="/importar"
                className="mt-3 flex items-center justify-between border border-white/12 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.13em] text-white/40 transition-colors hover:border-signal/40 hover:text-signal"
              >
                <span className="flex items-center gap-2">
                  <FileUp className="h-3 w-3" />
                  Importar archivo FIT / TCX
                </span>
                <span className="text-white/20">→</span>
              </Link>
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
            PROTOCOLO DE PRECISIÓN DINÁMICA / {activeZoneKey.toUpperCase()}
          </span>
          <span className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/20">
            ENGINE READY / SWEET {formatBpm(sweetMin)}-{formatBpm(sweetMax)} / GRACE 15S
          </span>
        </div>
        <div className="grid gap-px bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              tag: "01 / SWEET BAND",
              title: "Micro-pasillo central",
              value: "+10 PTS/S",
              text: `Franja de 4 latidos entre ${formatBpm(sweetMin)} y ${formatBpm(sweetMax)} bpm.`,
              accent: "text-signal",
            },
            {
              tag: "02 / ZONA",
              title: "Periferia válida",
              value: "+5 PTS/S",
              text: `Dentro de ${zone.min}-${zone.max}, pero fuera del micro-pasillo central.`,
              accent: "text-white/75",
            },
            {
              tag: "03 / EGO",
              title: `Sobre ${zone.max}`,
              value: "−5 × BPM",
              text: "Cada latido de exceso se multiplica por 5 puntos por segundo.",
              accent: "text-blood-bright",
            },
            {
              tag: "04 / DÉFICIT",
              title: `Bajo ${zone.min}`,
              value: "−2 × BPM",
              text: "Cada latido por debajo de la zona resta 2 puntos por segundo.",
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
          DEMO ACTIVITY: 8.24 KM / 45:00 / SUUNTO RACE S
        </span>
        <span className="flex items-center gap-3">
          <span>STREAM: {MOCK_ACTIVITY_ID}</span>
          <span className="text-white/10">//</span>
          <span>{formatDuration(MISSION_01.durationMinutes * 60)}</span>
          <span>{formatDistance(8240)}</span>
        </span>
      </section>
    </div>
  );
}
