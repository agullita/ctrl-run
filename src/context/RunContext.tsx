import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchLatestActivityPayload } from "../lib/activityRepository";
import {
  loadUserProfile,
  persistPrecisionRun,
  saveUserProfile,
} from "../lib/profileRepository";
import { evaluateHeartRatePrecision } from "../lib/scoring";
import {
  SUUNTO_DEMO_MODE,
  clearSuuntoConnection,
  connectDemoSession,
  disconnectSuunto,
  exchangeSuuntoCode,
  getSuuntoStatus,
  startSuuntoOAuth,
} from "../lib/suunto";
import { ensureSupabaseUser } from "../lib/supabase";
import { EMPTY_PROFILE, isProfileComplete } from "../lib/zones";
import type {
  ActivityPayload,
  StoredRun,
  SuuntoStatus,
  UserProfile,
  ZoneKey,
  ZoneProfile,
} from "../lib/types";

const RUN_STORAGE_KEY = "ctrlrun:last-run";

interface RunContextValue {
  run: StoredRun | null;
  profile: UserProfile;
  profileReady: boolean;
  profileSaving: boolean;
  isSyncing: boolean;
  error: string | null;
  connected: boolean;
  suuntoUsername: string | null;
  demoMode: boolean;
  syncActivity: (zoneKey?: ZoneKey) => Promise<StoredRun>;
  auditImportedActivity: (
    payload: ActivityPayload,
    zoneKey: ZoneKey,
  ) => Promise<StoredRun>;
  connect: () => "oauth" | "demo";
  completeConnection: (code: string) => Promise<SuuntoStatus>;
  disconnect: () => Promise<void>;
  saveProfile: (profile: ZoneProfile) => Promise<UserProfile>;
  reset: () => void;
}

const RunContext = createContext<RunContextValue | null>(null);

function readStoredRun(): StoredRun | null {
  try {
    const raw = sessionStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRun;

    if (
      !parsed?.activity ||
      !parsed?.result ||
      !Array.isArray(parsed.result.series) ||
      typeof parsed.result.score1000 !== "number" ||
      typeof parsed.result.config?.graceSeconds !== "number" ||
      typeof parsed.result.config?.sweetSpotMin !== "number" ||
      typeof parsed.result.config?.sweetSpotMax !== "number" ||
      typeof parsed.result.config?.zoneMin !== "number" ||
      typeof parsed.result.config?.zoneKey !== "string"
    ) {
      sessionStorage.removeItem(RUN_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistRun(run: StoredRun): void {
  try {
    sessionStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
  } catch {
    return;
  }
}

export function RunProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<StoredRun | null>(readStoredRun);
  const [profile, setProfile] = useState<UserProfile>({
    id: null,
    ...EMPTY_PROFILE,
    remote: false,
  });
  const [profileReady, setProfileReady] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [suuntoUsername, setSuuntoUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const user = await ensureSupabaseUser();
      if (!active) return;

      setUserId(user?.id ?? null);
      const loadedProfile = await loadUserProfile(user?.id ?? null);
      if (!active) return;

      setProfile(loadedProfile);
      setProfileReady(true);
      const status = await getSuuntoStatus();
      if (!active) return;

      setConnected(status.connected);
      setSuuntoUsername(status.username);
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const syncActivity = useCallback(
    async (zoneKey: ZoneKey = "z2") => {
      if (syncingRef.current) {
        throw new Error("SYNC_IN_PROGRESS");
      }

      if (!isProfileComplete(profile)) {
        throw new Error("PROFILE_INCOMPLETE");
      }

      syncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const payload = await fetchLatestActivityPayload();
      const result = evaluateHeartRatePrecision(payload.samples, profile, zoneKey);
      const storedRun: StoredRun = {
        activity: payload.activity,
        result,
        origin: payload.origin,
        syncedAt: new Date().toISOString(),
      };

      setRun(storedRun);
      persistRun(storedRun);
      void persistPrecisionRun(userId, storedRun);
      return storedRun;
      } catch (syncError) {
        const message =
          syncError instanceof Error && syncError.message === "SYNC_IN_PROGRESS"
            ? "Ya hay una sincronización en curso."
            : syncError instanceof Error && syncError.message === "PROFILE_INCOMPLETE"
              ? "Completa tu perfil fisiológico antes de sincronizar."
              : "No se pudo recuperar la actividad de Suunto. Se usará el stream demo.";
        setError(message);
        throw syncError;
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [profile, userId],
  );

  const auditImportedActivity = useCallback(
    async (payload: ActivityPayload, zoneKey: ZoneKey) => {
      if (!isProfileComplete(profile)) {
        throw new Error("PROFILE_INCOMPLETE");
      }

      const result = evaluateHeartRatePrecision(payload.samples, profile, zoneKey);
      const storedRun: StoredRun = {
        activity: payload.activity,
        result,
        origin: payload.origin,
        syncedAt: new Date().toISOString(),
      };

      setRun(storedRun);
      persistRun(storedRun);
      void persistPrecisionRun(userId, storedRun);
      return storedRun;
    },
    [profile, userId],
  );

  const connect = useCallback(() => {
    const mode = startSuuntoOAuth();
    if (mode === "demo") {
      connectDemoSession();
      setConnected(true);
      setSuuntoUsername(null);
    }
    return mode;
  }, []);

  const completeConnection = useCallback(async (code: string) => {
    const status = await exchangeSuuntoCode(code);
    setConnected(status.connected);
    setSuuntoUsername(status.username);
    return status;
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectSuunto();
    clearSuuntoConnection();
    setConnected(false);
    setSuuntoUsername(null);
  }, []);

  const saveProfile = useCallback(
    async (zone: ZoneProfile) => {
      setProfileSaving(true);

      try {
        const saved = await saveUserProfile(userId, zone);
        setProfile(saved);
        setProfileReady(true);
        setRun(null);
        sessionStorage.removeItem(RUN_STORAGE_KEY);
        return saved;
      } finally {
        setProfileSaving(false);
      }
    },
    [userId],
  );

  const reset = useCallback(() => {
    setRun(null);
    setError(null);
    sessionStorage.removeItem(RUN_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      run,
      profile,
      profileReady,
      profileSaving,
      isSyncing,
      error,
      connected,
      suuntoUsername,
      demoMode: SUUNTO_DEMO_MODE,
      syncActivity,
      auditImportedActivity,
      connect,
      completeConnection,
      disconnect,
      saveProfile,
      reset,
    }),
    [
      run,
      profile,
      profileReady,
      profileSaving,
      isSyncing,
      error,
      connected,
      suuntoUsername,
      syncActivity,
      auditImportedActivity,
      connect,
      completeConnection,
      disconnect,
      saveProfile,
      reset,
    ],
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
