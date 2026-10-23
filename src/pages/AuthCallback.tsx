import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BracketLabel, CornerMarks, StatusDot } from "../components/Icons";
import {
  STRAVA_DEMO_MODE,
  connectStravaSession,
  consumeOAuthState,
  exchangeStravaCode,
  saveStravaTokens,
} from "../lib/strava";

type Phase = "working" | "error";

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("working");
  const [message, setMessage] = useState("Validando respuesta de Strava...");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (STRAVA_DEMO_MODE) {
      connectStravaSession();
      navigate("/panel", { replace: true });
      return;
    }

    const error = params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    if (error) {
      setPhase("error");
      setMessage(`Strava rechazó la autorización: ${error}`);
      return;
    }

    if (!code) {
      setPhase("error");
      setMessage("La respuesta no incluye un código OAuth2 válido.");
      return;
    }

    const expectedState = consumeOAuthState();
    if (!state || !expectedState || state !== expectedState) {
      setPhase("error");
      setMessage("El estado OAuth2 no coincide. Inicia el enlace de nuevo.");
      return;
    }

    setMessage("Intercambiando código por token de acceso...");

    exchangeStravaCode(code)
      .then((token) => {
        saveStravaTokens(token);
        setMessage("Token seguro. Abriendo el panel de control...");
        window.setTimeout(() => navigate("/panel", { replace: true }), 500);
      })
      .catch((exchangeError: unknown) => {
        setPhase("error");
        setMessage(
          exchangeError instanceof Error
            ? exchangeError.message
            : "No se pudo completar el intercambio de token.",
        );
      });
  }, [navigate, params]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1480px] items-center px-4 py-12 sm:px-6 lg:px-10">
      <div className="relative w-full border border-white/10 bg-[#080908] p-6 sm:p-10">
        <CornerMarks tone={phase === "error" ? "blood" : "signal"} />
        <div className="flex flex-wrap items-center gap-3">
          <BracketLabel>OAuth2 / callback</BracketLabel>
          <span className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
            <StatusDot tone={phase === "error" ? "blood" : "signal"} pulse />
            {phase === "error" ? "HANDSHAKE_FAILED" : "HANDSHAKE_ACTIVE"}
          </span>
        </div>

        <h1 className="mt-6 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold uppercase leading-[0.9] tracking-[-0.055em]">
          {phase === "error" ? "Enlace" : "Sincronizando"}
          <span className={phase === "error" ? "block text-blood-bright" : "block text-signal"}>
            {phase === "error" ? "interrumpido." : "motor."}
          </span>
        </h1>

        <div className="mt-7 max-w-xl border border-white/10 bg-black px-4 py-4 font-mono text-[9px] uppercase leading-6 tracking-[0.12em] text-white/40">
          <div className="text-signal/70">&gt; strava.oauth.callback</div>
          <div className="mt-1">&gt; {message}</div>
        </div>

        {phase === "error" && (
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="mt-7 border border-signal px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-signal transition-colors hover:bg-signal hover:text-black"
          >
            Volver a intentar
          </button>
        )}
      </div>
    </div>
  );
}
