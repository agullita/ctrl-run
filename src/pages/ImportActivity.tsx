import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileUp,
  HeartPulse,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { TerminalButton } from "../components/Buttons";
import { BracketLabel, CornerMarks, StatusDot } from "../components/Icons";
import { useRun } from "../context/RunContext";
import {
  formatBpm,
  formatDate,
  formatDistance,
  formatDuration,
  formatNumber,
} from "../lib/format";
import {
  parseActivityFile,
  type ImportedActivity,
} from "../lib/fileImport";
import {
  ZONE_DEFINITIONS,
  getZoneDefinition,
  isProfileComplete,
} from "../lib/zones";
import type { ZoneKey } from "../lib/types";

const FORMAT_LABEL = {
  fit: "FIT / binario",
  tcx: "TCX / XML",
  gpx: "GPX / GPS + HR",
  csv: "CSV / time,bpm",
} as const;

export function ImportActivityPage() {
  const { profile, profileReady, auditImportedActivity } = useRun();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneKey>("z2");
  const [imported, setImported] = useState<ImportedActivity | null>(null);
  const [busy, setBusy] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isProfileComplete(profile)) {
    return <Navigate to="/onboarding" replace />;
  }

  const zone = profile.zones[selectedZone] ?? profile.zones.z2;
  if (!zone) return <Navigate to="/onboarding" replace />;

  const definition = getZoneDefinition(selectedZone);
  const sweetSpot = (zone.min + zone.max) / 2;
  const sweetMin = sweetSpot - 2;
  const sweetMax = sweetSpot + 2;

  const processFile = async (file: File | undefined) => {
    if (!file || busy) return;

    setBusy(true);
    setError(null);
    setImported(null);

    try {
      const parsed = await parseActivityFile(file);
      setImported(parsed);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "No se pudo interpretar el archivo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAudit = async () => {
    if (!imported || auditing) return;

    setAuditing(true);
    setError(null);

    try {
      await auditImportedActivity(imported.payload, selectedZone);
      navigate("/arbitro");
    } catch {
      setError("No se pudo abrir la auditoría. Revisa tu perfil fisiológico.");
      setAuditing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <BracketLabel>IMPORT / LOCAL FILE</BracketLabel>
          <span className="h-3 w-px bg-white/15" />
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
            SIN SUUNTO / SIN OAUTH
          </span>
        </div>
        <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-signal/60">
          <StatusDot tone="signal" pulse />
          Parser local
        </span>
      </div>

      <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-signal/65">
            Input alternativo / archivo de actividad
          </div>
          <h1 className="mt-2 font-display text-[clamp(2.3rem,5.5vw,4.8rem)] font-bold uppercase leading-[0.86] tracking-[-0.06em]">
            Sube el archivo.
            <span className="block text-white/35">El árbitro hace el resto.</span>
          </h1>
        </div>
        <p className="max-w-sm font-mono text-[8px] uppercase leading-relaxed tracking-[0.13em] text-white/25">
          El archivo se procesa en tu navegador. Solo se guardan el resultado y
          las métricas de la auditoría.
        </p>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="relative border border-white/10 bg-[#080908]">
          <CornerMarks />
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
              <UploadCloud className="h-3 w-3 text-signal/60" />
              Origen de datos
            </div>
            <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">
              MAX 25 MB
            </span>
          </div>

          <div className="p-4 sm:p-6">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void processFile(event.dataTransfer.files[0]);
              }}
              className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center border border-dashed px-5 py-10 text-center transition-colors ${
                dragging
                  ? "border-signal bg-signal/[0.06]"
                  : "border-white/18 bg-black/30 hover:border-signal/50"
              }`}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".fit,.tcx,.gpx,.csv"
                className="hidden"
                onChange={(event) => {
                  void processFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />

              <span className="flex h-14 w-14 items-center justify-center border border-signal/25 bg-signal/[0.04]">
                <FileUp className="h-6 w-6 text-signal" />
              </span>
              <div className="mt-5 font-display text-xl font-semibold uppercase tracking-[-0.02em] text-white/85">
                {busy ? "Analizando archivo..." : "Arrastra o selecciona tu actividad"}
              </div>
              <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.14em] text-white/30">
                .fit / .tcx / .gpx / .csv
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {Object.entries(FORMAT_LABEL).map(([format, label]) => (
                  <span
                    key={format}
                    className={`border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] ${
                      format === "fit"
                        ? "border-signal/30 text-signal/65"
                        : "border-white/10 text-white/25"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 border border-blood-bright/35 bg-blood/[0.08] px-3 py-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-blood-bright">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            {imported && (
              <div className="mt-4 border border-signal/25 bg-signal/[0.025] px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-signal" />
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/70">
                        {imported.fileName}
                      </div>
                      <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-white/25">
                        {FORMAT_LABEL[imported.format]} /{" "}
                        {(imported.fileSize / 1024).toFixed(1)} KB /{" "}
                        {imported.payload.samples.length} muestras HR
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImported(null)}
                    aria-label="Quitar archivo"
                    className="text-white/25 hover:text-blood-bright"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-px bg-white/[0.07] sm:grid-cols-4">
                  {[
                    ["DURACIÓN", formatDuration(imported.payload.activity.elapsedTime)],
                    ["DISTANCIA", formatDistance(imported.payload.activity.distance)],
                    ["MEDIA", `${imported.payload.activity.averageHeartrate} BPM`],
                    ["PICO", `${imported.payload.activity.maxHeartrate} BPM`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[#080908] px-3 py-2.5">
                      <div className="font-mono text-[6.5px] uppercase tracking-[0.13em] text-white/22">
                        {label}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase text-white/65">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="border border-white/10 bg-[#080908]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
                <SlidersHorizontal className="h-3 w-3 text-signal/60" />
                Misión del archivo
              </div>
              <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">
                {selectedZone.toUpperCase()}
              </span>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-5 gap-px bg-white/[0.08]">
                {ZONE_DEFINITIONS.map((item) => {
                  const range = profile.zones[item.key];
                  const active = item.key === selectedZone;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedZone(item.key)}
                      disabled={!range}
                      className={`bg-[#080908] px-1 py-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                        active ? "text-signal shadow-[inset_0_2px_0_#39ff14]" : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      <div className="font-mono text-[9px] font-bold uppercase">
                        {item.key}
                      </div>
                      <div className="mt-1 font-mono text-[6px] tracking-[0.05em]">
                        {range ? `${range.min}-${range.max}` : "---"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 border border-white/[0.07] bg-black/40 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-white/22">
                    Misión seleccionada
                  </div>
                  <Link
                    to="/onboarding"
                    className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/25 underline decoration-white/15 underline-offset-4 hover:text-signal"
                  >
                    Recalibrar
                  </Link>
                </div>
                <div className="mt-1 font-display text-lg uppercase text-white/80">
                  {definition.label}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.1em]">
                  <span className="text-white/35">
                    RANGO {zone.min}—{zone.max} BPM
                  </span>
                  <span className="text-signal/70">SWEET {formatBpm(sweetMin)}—{formatBpm(sweetMax)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 font-mono text-[7px] uppercase leading-relaxed tracking-[0.12em] text-white/22">
                <HeartPulse className="mt-0.5 h-3 w-3 shrink-0 text-blood-bright/65" />
                {profile.calibrationMethod === "manual"
                  ? `Límites manuales LTHR / Z2 ${zone.min}-${zone.max}. Sweet band de 4 latidos y 15 s de gracia.`
                  : `Zonas calculadas con FCM ${profile.hrMax} / FCR ${profile.hrRest}. Sweet band de 4 latidos y 15 s de gracia.`}
              </div>
            </div>
          </section>

          <section className="flex flex-1 flex-col border border-signal/25 bg-[#080a08] p-4">
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
              Preview
            </div>

            {imported ? (
              <>
                <div className="mt-4 space-y-2 font-mono text-[8px] uppercase tracking-[0.1em]">
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                    <span className="text-white/22">Actividad</span>
                    <span className="text-right text-white/55">
                      {imported.payload.activity.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                    <span className="text-white/22">Inicio</span>
                    <span className="text-white/55">
                      {formatDate(imported.payload.activity.startedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                    <span className="text-white/22">Muestras</span>
                    <span className="text-white/55">
                      {formatNumber(imported.payload.samples.length)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/22">Formato</span>
                    <span className="text-signal/65">
                      {imported.format.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <TerminalButton
                    variant="solid"
                    onClick={handleAudit}
                    loading={auditing}
                    trailing={<ArrowRight className="h-3.5 w-3.5" />}
                    className="w-full justify-between"
                  >
                    Auditar archivo
                  </TerminalButton>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <FileUp className="h-6 w-6 text-white/12" />
                <div className="mt-4 font-mono text-[8px] uppercase leading-relaxed tracking-[0.13em] text-white/25">
                  Carga un archivo para previsualizar
                  <br />
                  la auditoría antes de puntuar.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-white/[0.08] bg-black/30 px-4 py-3.5 font-mono text-[7.5px] uppercase tracking-[0.13em] text-white/22">
        <span>
          &gt; El parseo FIT usa Garmin FIT SDK. TCX/GPX se procesan como XML local.
        </span>
        <span className="text-white/35">1 SAMPLE = 1 SECOND / ENGINE 1HZ</span>
      </section>
    </div>
  );
}
