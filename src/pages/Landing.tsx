import { ArrowDownRight, ArrowUpRight, Crosshair, Radio, Terminal } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StravaButton, TerminalButton } from "../components/Buttons";
import {
  BracketLabel,
  CornerMarks,
  StatusDot,
  StravaMark,
} from "../components/Icons";
import { LandingTelemetry } from "../components/LandingTelemetry";
import { StravaModal } from "../components/StravaModal";
import { useRun } from "../context/RunContext";
import { STRAVA_DEMO_MODE } from "../lib/strava";

const protocol = [
  {
    number: "01",
    icon: Radio,
    title: "Conecta",
    text: "Strava entrega la serie temporal de pulso. Sin fotos, sin splits heroicos, sin storytelling.",
    code: "GET /activities/{id}/streams",
  },
  {
    number: "02",
    icon: Crosshair,
    title: "Audita",
    text: "Cada segundo se compara contra la diana. No importa tu ritmo. Importa tu obediencia fisiológica.",
    code: "1 SAMPLE = 1 VERDICT",
  },
  {
    number: "03",
    icon: Terminal,
    title: "Penaliza",
    text: "El exceso de ego cuesta el doble que la falta de empuje. La precisión no se negocia con la vanidad.",
    code: "ABOVE -2 / BELOW -1",
  },
];

const ticker = [
  "NO REGISTRAS",
  "TE AUDITAN",
  "APAGA EL EGO",
  "ENCIENDE EL CONTROL",
  "ZONA 2 ESTRICTA",
  "1 SAMPLE = 1 SECOND",
  "RECARGA FISIOLÓGICA",
];

export function LandingPage() {
  const { connect } = useRun();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const handleAuthorize = () => {
    const mode = connect();
    if (mode === "demo") {
      setModalOpen(false);
      navigate("/panel");
    }
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="mx-auto grid max-w-[1480px] gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-10 lg:py-20">
          <div className="relative animate-rise">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 border border-signal/25 bg-signal/[0.04] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-signal/80">
                <StatusDot tone="signal" pulse />
                PROTOCOLO 0x01
              </span>
              <BracketLabel>ÁRBITRO FISIOLÓGICO</BracketLabel>
            </div>

            <h1 className="mt-7 font-display text-[clamp(2.9rem,7vw,6.4rem)] font-bold uppercase leading-[0.84] tracking-[-0.065em]">
              <span className="block text-white">Apaga el ego.</span>
              <span className="mt-1 block text-signal [text-shadow:0_0_50px_rgba(57,255,20,0.18)]">
                Enciende el control.
              </span>
            </h1>

            <p className="mt-7 max-w-[610px] text-[15px] leading-relaxed text-white/55 sm:text-base">
              El primer árbitro de disciplina fisiológica que penaliza el
              sobreesfuerzo y premia el control de tu motor. Strava es para tu
              ego; Ctrl+run es para tu rendimiento.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <StravaButton onClick={() => setModalOpen(true)} />
              <span className="font-mono text-[8px] uppercase leading-relaxed tracking-[0.14em] text-white/25">
                OAuth2 / solo lectura
                <br />
                {STRAVA_DEMO_MODE ? "flujo demo habilitado" : "conexión real"}
              </span>
            </div>

            <div className="mt-9 grid max-w-[560px] grid-cols-3 border-t border-white/[0.08] pt-4 font-mono">
              {[
                ["1000", "PTS BASE"],
                ["1 HZ", "RESOLUCIÓN"],
                ["ZONA 2", "TARGET"],
              ].map(([value, label], index) => (
                <div
                  key={label}
                  className={index > 0 ? "border-l border-white/[0.08] pl-4" : ""}
                >
                  <div className="text-lg font-bold tracking-[-0.03em] text-white/85 sm:text-xl">
                    {value}
                  </div>
                  <div className="mt-1 text-[7.5px] uppercase tracking-[0.18em] text-white/25">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-9 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.2em] text-white/20">
              <ArrowDownRight className="h-3 w-3 text-signal/50" />
              SCROLL / INSPECCIONAR PROTOCOLO
            </div>
          </div>

          <div className="relative animate-rise lg:pl-4">
            <div className="absolute -left-3 -top-3 z-10 hidden sm:block">
              <BracketLabel className="bg-void px-1">LIVE_TELEMETRY</BracketLabel>
            </div>
            <div className="absolute -right-2 -top-2 hidden h-16 w-16 border-r border-t border-white/10 sm:block" />
            <div className="absolute -bottom-2 -left-2 hidden h-16 w-16 border-b border-l border-white/10 sm:block" />
            <LandingTelemetry />
            <div className="mt-3 flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.16em] text-white/20">
              <span>[TARGET] 125—135 BPM</span>
              <span>NO_EGO / CONTROL_READY</span>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-b border-white/[0.08] bg-black/40">
        <div className="marquee-track flex w-max items-center gap-6 py-3 font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/30">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-6" aria-hidden={copy === 1}>
              {ticker.map((item, index) => (
                <span key={`${copy}-${item}`} className="flex items-center gap-6">
                  {index > 0 && <span className="text-blood-bright/60">//</span>}
                  {item}
                </span>
              ))}
              <span className="text-blood-bright/60">//</span>
            </div>
          ))}
        </div>
      </div>

      <section className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-[1480px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <BracketLabel>MANIFIESTO / CTRL+R</BracketLabel>
              <h2 className="mt-5 max-w-xl font-display text-3xl font-semibold uppercase leading-[0.98] tracking-[-0.04em] sm:text-4xl">
                No cuenta lo que haces.
                <span className="block text-white/35">Cuenta cómo lo haces.</span>
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/45">
                El ego convierte cada salida en una competencia. Ctrl+run la
                convierte en una auditoría. Tu corazón no negocia: o respetas la
                zona, o el marcador lo expone.
              </p>
              <div className="mt-7 flex items-center gap-3">
                <span className="h-px w-12 bg-signal/50" />
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-signal/60">
                  MEDIR / CONTENER / RECARGAR
                </span>
              </div>
            </div>

            <div className="relative border border-white/10 bg-[#080908]">
              <CornerMarks />
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
                  SPEC / MISIÓN 01
                </span>
                <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-signal/70">
                  <StatusDot tone="signal" />
                  ARMED
                </span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {[
                  ["OBJETIVO", "40 MIN EN ZONA 2"],
                  ["TARGET", "125 — 135 BPM"],
                  ["RESOLUCIÓN", "1 SEGUNDO"],
                  ["PENALIZACIÓN EGO", "-2 PTS / SEG"],
                  ["PENALIZACIÓN DÉFICIT", "-1 PT / SEG"],
                  ["REDLINE", ">145 BPM / 30S → FALLO"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-4 py-3.5"
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                      {label}
                    </span>
                    <span
                      className={`text-right font-mono text-[10px] uppercase tracking-[0.1em] ${
                        value.includes("145") ? "text-blood-bright" : "text-white/75"
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
            {protocol.map((step) => (
              <div key={step.number} className="group relative bg-[#070807] p-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center border border-white/10 text-signal/70 transition-colors group-hover:border-signal/40">
                    <step.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-mono text-[9px] tracking-[0.18em] text-white/20">
                    [{step.number}]
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold uppercase tracking-[-0.03em]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/40">
                  {step.text}
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-3 font-mono text-[7.5px] uppercase tracking-[0.13em] text-signal/45">
                  {step.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/[0.08] bg-black/20">
        <div className="mx-auto max-w-[1480px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <BracketLabel>REGLAS DEL ÁRBITRO</BracketLabel>
              <h2 className="mt-4 font-display text-3xl font-semibold uppercase leading-none tracking-[-0.04em] sm:text-4xl">
                El pulso no se negocia.
              </h2>
            </div>
            <p className="max-w-sm font-mono text-[8px] uppercase leading-relaxed tracking-[0.14em] text-white/25">
              Cada segundo fuera de la diana deja una marca. El marcador empieza
              en 1000. No hay bonus por sufrimiento.
            </p>
          </div>

          <div className="mt-10 grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                tag: "[TARGET]",
                value: "125—135",
                unit: "BPM",
                text: "La única zona que no cuesta puntos.",
                tone: "text-signal",
                border: "border-t-signal",
              },
              {
                tag: "[EGO]",
                value: "-2",
                unit: "PTS / SEG",
                text: "Cada segundo por encima de 135 bpm.",
                tone: "text-blood-bright",
                border: "border-t-blood-bright",
              },
              {
                tag: "[DÉFICIT]",
                value: "-1",
                unit: "PT / SEG",
                text: "Cada segundo por debajo de 125 bpm.",
                tone: "text-white/55",
                border: "border-t-white/25",
              },
              {
                tag: "[REDLINE]",
                value: "FALLO",
                unit: ">30 SEG",
                text: "Más de 145 bpm durante 30 s activa la alerta.",
                tone: "text-blood-bright",
                border: "border-t-blood-bright",
              },
            ].map((rule) => (
              <div
                key={rule.tag}
                className={`border-t-2 ${rule.border} bg-[#070807] p-5`}
              >
                <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/25">
                  {rule.tag}
                </div>
                <div className={`mt-5 font-mono text-4xl font-bold tracking-[-0.06em] ${rule.tone}`}>
                  {rule.value}
                </div>
                <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
                  {rule.unit}
                </div>
                <p className="mt-5 border-t border-white/[0.06] pt-3 text-[12px] leading-relaxed text-white/35">
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1480px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
          <div className="relative overflow-hidden border border-signal/20 bg-signal/[0.025] px-5 py-10 sm:px-10 sm:py-14">
            <CornerMarks />
            <div className="absolute right-0 top-0 hidden h-full w-1/3 bg-[linear-gradient(90deg,transparent,rgba(57,255,20,0.04))] lg:block" />
            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.2em] text-signal/60">
                  <StravaMark className="h-3 w-3" />
                  STRAVA ES PARA TU EGO
                </div>
                <h2 className="mt-5 max-w-3xl font-display text-[clamp(2rem,4.5vw,3.8rem)] font-bold uppercase leading-[0.9] tracking-[-0.055em]">
                  Tu próximo entrenamiento
                  <span className="block text-signal">no es una carrera.</span>
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
                  Es una prueba de contención. Conecta Strava y deja que el
                  árbitro haga el trabajo que tu ego no puede hacer solo.
                </p>
              </div>
              <TerminalButton
                variant="outline"
                onClick={() => setModalOpen(true)}
                trailing={<ArrowUpRight className="h-3.5 w-3.5" />}
              >
                Iniciar auditoría
              </TerminalButton>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-4 font-mono text-[8px] uppercase tracking-[0.15em] text-white/25">
              <span className="flex items-center gap-2">
                <StatusDot tone="signal" /> DEMO STREAM LISTO
              </span>
              <span>NO SE PUBLICA NADA</span>
              <span>NO SE COMPARTE NADA</span>
              <Link to="/panel" className="ml-auto text-signal/60 hover:text-signal">
                Ir al panel →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <StravaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAuthorize={handleAuthorize}
      />
    </>
  );
}
