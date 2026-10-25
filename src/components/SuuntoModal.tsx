import { useEffect, useState } from "react";
import { ArrowUpRight, Check, X } from "lucide-react";
import { SUUNTO_DEMO_MODE } from "../lib/suunto";
import { CornerMarks, StatusDot, SuuntoMark } from "./Icons";

const LOG_LINES = [
  "GET https://cloudapi-oauth.suunto.com/oauth/authorize",
  "PARAMS response_type=code  client_id=PUBLIC_CLIENT  redirect_uri=/auth/suunto/callback",
  "HANDSHAKE SUUNTO CLOUD API ............................... OK",
  "GET /v3/workouts/{key}?extensions=HeartrateStreamExtension",
  "PRECISION ENGINE / SWEET BAND .......................... ARMED",
];

export function SuuntoModal({
  open,
  onClose,
  onAuthorize,
}: {
  open: boolean;
  onClose: () => void;
  onAuthorize: () => void;
}) {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!open) {
      setVisibleLines(0);
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleLines((current) => {
        if (current >= LOG_LINES.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 260);

    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  const ready = visibleLines >= LOG_LINES.length;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Conexión con Suunto"
    >
      <div className="relative w-full max-w-xl border border-signal/25 bg-[#070807]">
        <CornerMarks />
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <StatusDot tone="signal" pulse />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
              OAuth2 // Suunto Cloud API
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 text-white/30 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[-0.03em] sm:text-3xl">
                Enlazar motor
              </h2>
              <p className="mt-2 max-w-sm font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-white/35">
                Lectura de workouts y frecuencia cardíaca. El token se intercambia
                y se guarda en el servidor. Ctrl+run no escribe en tu cuenta.
              </p>
            </div>
            <SuuntoMark className="h-8 w-8 text-signal" />
          </div>

          <div className="mt-5 border border-white/10 bg-black p-3.5 font-mono text-[9px] leading-relaxed text-white/45">
            {LOG_LINES.map((line, index) => (
              <div
                key={line}
                className={`flex gap-2 transition-opacity ${
                  index < visibleLines ? "opacity-100" : "opacity-0"
                }`}
              >
                <span className="text-signal/70">&gt;</span>
                <span>{line}</span>
                {index < visibleLines && (
                  <Check className="ml-auto h-3 w-3 shrink-0 text-signal" />
                )}
              </div>
            ))}
            <div className="mt-1 flex gap-2 text-white/25">
              <span className="text-signal/70">&gt;</span>
              <span className="terminal-cursor">
                {ready ? "ready_to_run" : "waiting"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
              {SUUNTO_DEMO_MODE ? "Modo demo / stream Suunto local" : "OAuth2 real"}
            </span>
            <button
              type="button"
              onClick={onAuthorize}
              disabled={!ready}
              className="group inline-flex items-center gap-3 border border-signal bg-signal px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-black hover:text-signal disabled:cursor-not-allowed disabled:opacity-35"
            >
              {SUUNTO_DEMO_MODE ? "Entrar al panel" : "Autorizar en Suunto"}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
