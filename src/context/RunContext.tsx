import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchLatestActivityPayload,
  persistEvaluation,
} from "../lib/activityRepository";
import { evaluateHeartRateStream } from "../lib/scoring";
import {
  disconnectStrava,
  isStravaConnected,
  startStravaOAuth,
} from "../lib/strava";
import type { StoredRun } from "../lib/types";

const RUN_STORAGE_KEY = "ctrlrun:last-run";

interface RunContextValue {
  run: StoredRun | null;
  isSyncing: boolean;
  error: string | null;
  connected: boolean;
  syncActivity: () => Promise<StoredRun>;
  connect: () => "oauth" | "demo";
  disconnect: () => void;
  reset: () => void;
}

const RunContext = createContext<RunContextValue | null>(null);

function readStoredRun(): StoredRun | null {
  try {
    const raw = sessionStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRun;
    if (!parsed?.activity || !parsed?.result) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistRun(run: StoredRun): void {
  try {
    sessionStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
  } catch {
    // La sesión sigue viva en memoria.
  }
}

export function RunProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<StoredRun | null>(readStoredRun);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(() => isStravaConnected());
  const syncingRef = useRef(false);

  const syncActivity = useCallback(async () => {
    if (syncingRef.current) {
      throw new Error("SYNC_IN_PROGRESS");
    }

    syncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const payload = await fetchLatestActivityPayload();
      const result = evaluateHeartRateStream(payload.streams);
      const storedRun: StoredRun = {
        activity: payload.activity,
        result,
        origin: payload.origin,
        syncedAt: new Date().toISOString(),
      };

      setRun(storedRun);
      persistRun(storedRun);
      void persistEvaluation(payload.activity.id, result);
      return storedRun;
    } catch (syncError) {
      const message =
        syncError instanceof Error && syncError.message === "SYNC_IN_PROGRESS"
          ? "Ya hay una sincronización en curso."
          : "No se pudo recuperar el stream cardíaco. Reintenta la conexión.";
      setError(message);
      throw syncError;
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  const connect = useCallback(() => {
    const mode = startStravaOAuth();
    if (mode === "demo") setConnected(true);
    return mode;
  }, []);

  const disconnect = useCallback(() => {
    disconnectStrava();
    setConnected(false);
  }, []);

  const reset = useCallback(() => {
    setRun(null);
    setError(null);
    sessionStorage.removeItem(RUN_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      run,
      isSyncing,
      error,
      connected,
      syncActivity,
      connect,
      disconnect,
      reset,
    }),
    [connected, connect, disconnect, error, isSyncing, reset, run, syncActivity],
  );

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

export function useRun(): RunContextValue {
  const context = useContext(RunContext);

  if (!context) {
    throw new Error("useRun debe usarse dentro de RunProvider");
  }

  return context;
}
