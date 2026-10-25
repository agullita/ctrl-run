import { useEffect, useState } from "react";
import { ArrowRight, HeartPulse, SlidersHorizontal, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TerminalButton } from "../components/Buttons";
import { BracketLabel, CornerMarks, StatusDot } from "../components/Icons";
import { useRun } from "../context/RunContext";
import { formatBpm } from "../lib/format";
import {
  ZONE_DEFINITIONS,
  calculateKarvonenZones,
  createManualProfile,
  createProfile,
  validateBiometrics,
  validateManualZone,
} from "../lib/zones";
import type { CalibrationMethod, ZoneKey, ZoneRange } from "../lib/types";

export function OnboardingPage() {
  const { profile, profileReady, profileSaving, saveProfile } = useRun();
  const navigate = useNavigate();
  const [method, setMethod] = useState<CalibrationMethod>(
    profile.calibrationMethod,
  );
  const [hrMax, setHrMax] = useState(180);
  const [hrRest, setHrRest] = useState(60);
  const [z2Min, setZ2Min] = useState(132);
  const [z2Max, setZ2Max] = useState(144);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMethod(profile.calibrationMethod);
    if (profile.hrMax && profile.hrRest) {
      setHrMax(profile.hrMax);
      setHrRest(profile.hrRest);
    }
    if (profile.zones.z2) {
      setZ2Min(profile.zones.z2.min);
      setZ2Max(profile.zones.z2.max);
    }
  }, [profile.calibrationMethod, profile.hrMax, profile.hrRest, profile.zones.z2]);

  const karvonenError =
    method === "karvonen" ? validateBiometrics(hrMax, hrRest) : null;
  const manualError =
    method === "manual" ? validateManualZone(z2Min, z2Max) : null;
  const validation = karvonenError ?? manualError;
  const previewZones: Partial<Record<ZoneKey, ZoneRange | null>> | null =
    validation
      ? null
      : method === "karvonen"
        ? calculateKarvonenZones(hrMax, hrRest)
        : { z2: { min: Math.round(z2Min), max: Math.round(z2Max) } };
  const reserve = Math.max(0, Math.round(hrMax - hrRest));

  const handleSave = async () => {
    const message = method === "karvonen" ? karvonenError : manualError;
    if (message) {
      setError(message);
      return;
    }

    setError(null);
    const nextProfile =
      method === "karvonen"
        ? createProfile(hrMax, hrRest)
        : createManualProfile(z2Min, z2Max);

    await saveProfile(nextProfile);
    navigate("/panel", { replace: true });
  };

  if (!profileReady) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1480px] items-center px-4 py-14 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
          <StatusDot tone="warning" pulse />
          Cargando perfil fisiológico...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <BracketLabel>ONBOARDING / CALIBRACIÓN</BracketLabel>
          <span className="h-3 w-px bg-white/15" />
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
            {profile.remote ? "SUPABASE // PROFILE" : "LOCAL // PROFILE"}
          </span>
        </div>
        <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-signal/60">
          <StatusDot tone="signal" pulse />
          {method === "karvonen" ? "Karvonen / auto" : "Manual / LTHR"}
        </span>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative border border-signal/20 bg-[#080a08] p-5 sm:p-8">
          <CornerMarks />
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-signal/30 bg-signal/[0.04]">
              <Terminal className="h-4 w-4 text-signal" />
            </span>
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-signal/65">
                CTRL+RUN / physiological bootstrap
              </div>
              <h1 className="mt-2 font-display text-[clamp(2.4rem,5.5vw,4.8rem)] font-bold uppercase leading-[0.86] tracking-[-0.06em]">
                Calibra
                <span className="block text-signal">tu motor.</span>
              </h1>
            </div>
          </div>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/45">
            Elige cómo definir tu Zona 2. Karvonen calcula el espectro completo a
            partir de tu frecuencia máxima y de reposo. El modo manual respeta los
            límites que ya usas en tu reloj, incluidos los basados en LTHR.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-px border border-white/[0.08] bg-white/[0.08] font-mono">
            {[
              {
                key: "karvonen" as const,
                title: "KARVONEN",
                subtitle: "Automático / FCM + FCR",
              },
              {
                key: "manual" as const,
                title: "MANUAL / LTHR",
                subtitle: "Avanzado / límites Z2",
              },
            ].map((option) => {
              const active = method === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setMethod(option.key);
                    setError(null);
                  }}
                  className={`bg-[#080a08] px-3 py-3 text-left transition-colors ${
                    active
                      ? "text-signal shadow-[inset_0_2px_0_#39ff14]"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  <div className="text-[8px] font-bold uppercase tracking-[0.14em]">
                    {option.title}
                  </div>
                  <div className="mt-1 text-[7px] uppercase tracking-[0.09em] opacity-60">
                    {option.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {method === "karvonen" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="border border-white/12 bg-black/45 px-4 py-3.5">
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                  <HeartPulse className="h-3 w-3 text-blood-bright/70" />
                  FCM / FC máxima
                </span>
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={hrMax}
                  onChange={(event) => {
                    setHrMax(Number(event.target.value));
                    setError(null);
                  }}
                  className="mt-2 w-full bg-transparent font-mono text-4xl font-bold tracking-[-0.06em] text-white outline-none"
                  aria-label="Frecuencia cardíaca máxima"
                />
                <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                  bpm / máximo observado o estimado
                </span>
              </label>

              <label className="border border-white/12 bg-black/45 px-4 py-3.5">
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                  <SlidersHorizontal className="h-3 w-3 text-signal/70" />
                  FCR / FC reposo
                </span>
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={hrRest}
                  onChange={(event) => {
                    setHrRest(Number(event.target.value));
                    setError(null);
                  }}
                  className="mt-2 w-full bg-transparent font-mono text-4xl font-bold tracking-[-0.06em] text-signal outline-none"
                  aria-label="Frecuencia cardíaca en reposo"
                />
                <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                  bpm / sentado y en calma
                </span>
              </label>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="border border-white/12 bg-black/45 px-4 py-3.5">
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                  Z2 min / límite inferior
                </span>
                <input
                  type="number"
                  min={40}
                  max={229}
                  value={z2Min}
                  onChange={(event) => {
                    setZ2Min(Number(event.target.value));
                    setError(null);
                  }}
                  className="mt-2 w-full bg-transparent font-mono text-4xl font-bold tracking-[-0.06em] text-white outline-none"
                  aria-label="Límite inferior manual de Zona 2"
                />
                <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                  bpm / límite configurado en tu reloj
                </span>
              </label>

              <label className="border border-white/12 bg-black/45 px-4 py-3.5">
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                  Z2 max / límite superior
                </span>
                <input
                  type="number"
                  min={41}
                  max={230}
                  value={z2Max}
                  onChange={(event) => {
                    setZ2Max(Number(event.target.value));
                    setError(null);
                  }}
                  className="mt-2 w-full bg-transparent font-mono text-4xl font-bold tracking-[-0.06em] text-signal outline-none"
                  aria-label="Límite superior manual de Zona 2"
                />
                <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                  bpm / techo fisiológico de la misión
                </span>
              </label>
            </div>
          )}

          <div className="mt-4 grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
            {method === "karvonen" ? (
              <>
                <div className="bg-[#080a08] px-4 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    Reserva cardíaca
                  </div>
                  <div className="mt-1 font-mono text-lg text-white/80">{reserve} BPM</div>
                </div>
                <div className="bg-[#080a08] px-4 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    Fórmula
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-white/55">
                    (FCM − FCR) × % + FCR
                  </div>
                </div>
                <div className="bg-[#080a08] px-4 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    Cobertura
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-signal/60">
                    Z1—Z5
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#080a08] px-4 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    Z2 manual
                  </div>
                  <div className="mt-1 font-mono text-lg text-signal">
                    {Number.isFinite(z2Min) ? Math.round(z2Min) : "---"}—
                    {Number.isFinite(z2Max) ? Math.round(z2Max) : "---"}
                  </div>
                </div>
                <div className="bg-[#080a08] px-4 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    Referencia
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-white/55">
                    LTHR / reloj
                  </div>
                </div>
                <div className="bg-[#080a08] px-4 py-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/20">
                    Cobertura
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-signal/60">
                    Solo Z2
                  </div>
                </div>
              </>
            )}
          </div>

          {(error || validation) && (
            <div className="mt-4 border border-blood-bright/40 bg-blood/10 px-4 py-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-blood-bright">
              {error ?? validation}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <TerminalButton
              variant="solid"
              onClick={handleSave}
              loading={profileSaving}
              disabled={Boolean(validation)}
              trailing={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Guardar perfil y continuar
            </TerminalButton>
            <span className="font-mono text-[7px] uppercase leading-relaxed tracking-[0.13em] text-white/20">
              Puedes cambiar de método cuando quieras desde el panel.
            </span>
          </div>
        </section>

        <section className="relative border border-white/10 bg-[#080908]">
          <CornerMarks tone="neutral" />
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
              ESPECTRO / {method === "karvonen" ? "5 ZONAS" : "Z2 MANUAL"}
            </span>
            <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">
              {method === "karvonen" ? "Karvonen" : "LTHR"}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {ZONE_DEFINITIONS.map((definition) => {
              const zone = previewZones?.[definition.key];
              const center = zone ? (zone.min + zone.max) / 2 : null;
              const sweetMin = center !== null ? center - 2 : null;
              const sweetMax = center !== null ? center + 2 : null;
              const isManualOutsideZ2 =
                method === "manual" && definition.key !== "z2";
              const accent =
                definition.key === "z2"
                  ? "text-signal"
                  : definition.key === "z4"
                    ? "text-warning"
                    : definition.key === "z5"
                      ? "text-blood-bright"
                      : "text-white/70";

              return (
                <div
                  key={definition.key}
                  className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-4 ${
                    definition.key === "z2" ? "bg-signal/[0.025]" : ""
                  }`}
                >
                  <span className={`font-mono text-sm font-bold uppercase ${accent}`}>
                    {definition.key}
                  </span>
                  <div>
                    <div className="font-display text-sm text-white/70">
                      {definition.label}
                    </div>
                    <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.13em] text-white/22">
                      {isManualOutsideZ2 ? "No disponible en modo manual" : definition.description}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className={`text-sm ${isManualOutsideZ2 ? "text-white/20" : accent}`}>
                      {zone ? `${zone.min}—${zone.max}` : "---"}
                    </div>
                    <div className="text-[7px] uppercase tracking-[0.12em] text-white/20">
                      {sweetMin !== null && sweetMax !== null
                        ? `SWEET ${formatBpm(sweetMin)}—${formatBpm(sweetMax)}`
                        : "BPM"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/[0.08] px-4 py-4 font-mono text-[7px] uppercase leading-relaxed tracking-[0.13em] text-white/22">
            &gt; El motor aplicará una gracia de 15 s antes de penalizar una salida
            continuada de la zona.
            <br /> &gt; El modo manual conserva únicamente Z2 y evita conversiones
            automáticas sobre tus límites LTHR.
          </div>
        </section>
      </div>
    </div>
  );
}
