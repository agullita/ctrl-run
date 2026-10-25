import {
  invokeSupabaseFunction,
  isSupabaseConfigured,
} from "./supabase";
import type { SuuntoStatus, SuuntoSyncPayload } from "./types";

const CONNECTION_KEY = "ctrlrun:suunto-connection";
const OAUTH_STATE_KEY = "ctrlrun:suunto-oauth-state";

const clientId = import.meta.env.VITE_SUUNTO_CLIENT_ID?.trim() ?? "";
const demoFlag = import.meta.env.VITE_SUUNTO_DEMO_MODE?.trim() ?? "true";

export const SUUNTO_DEMO_MODE =
  demoFlag !== "false" || !clientId || !isSupabaseConfigured;

export const SUUNTO_AUTH_URL =
  import.meta.env.VITE_SUUNTO_AUTH_URL?.trim() ||
  "https://cloudapi-oauth.suunto.com/oauth/authorize";

export function getSuuntoRedirectUri(): string {
  const configured = import.meta.env.VITE_SUUNTO_REDIRECT_URI?.trim();
  return configured || `${window.location.origin}/auth/suunto/callback`;
}

export function createOAuthState(): string {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function buildSuuntoAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getSuuntoRedirectUri(),
    state,
  });

  return `${SUUNTO_AUTH_URL}?${params.toString()}`;
}

export function startSuuntoOAuth(): "oauth" | "demo" {
  if (SUUNTO_DEMO_MODE) {
    localStorage.setItem(CONNECTION_KEY, "demo");
    return "demo";
  }

  const state = createOAuthState();
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  window.location.assign(buildSuuntoAuthUrl(state));
  return "oauth";
}

export function consumeOAuthState(): string | null {
  const state = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  return state;
}

export function connectDemoSession(): void {
  localStorage.setItem(CONNECTION_KEY, "demo");
}

export function hasLocalDemoConnection(): boolean {
  return localStorage.getItem(CONNECTION_KEY) === "demo";
}

export function clearSuuntoConnection(): void {
  localStorage.removeItem(CONNECTION_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
}

export async function getSuuntoStatus(): Promise<SuuntoStatus> {
  if (SUUNTO_DEMO_MODE) {
    return {
      connected: hasLocalDemoConnection(),
      username: null,
      expiresAt: null,
      demo: true,
    };
  }

  try {
    const status = await invokeSupabaseFunction<{
      connected: boolean;
      username?: string | null;
      expiresAt?: string | null;
    }>("suunto-oauth", { action: "status" });

    return {
      connected: Boolean(status.connected),
      username: status.username ?? null,
      expiresAt: status.expiresAt ?? null,
      demo: false,
    };
  } catch {
    return {
      connected: false,
      username: null,
      expiresAt: null,
      demo: false,
    };
  }
}

export async function exchangeSuuntoCode(code: string): Promise<SuuntoStatus> {
  const result = await invokeSupabaseFunction<{
    connected: boolean;
    username?: string | null;
    expiresAt?: string | null;
  }>("suunto-oauth", {
    action: "exchange",
    code,
    redirectUri: getSuuntoRedirectUri(),
  });

  if (!result.connected) {
    throw new Error("SUUNTO_TOKEN_EXCHANGE_FAILED");
  }

  localStorage.setItem(CONNECTION_KEY, "oauth");
  return {
    connected: true,
    username: result.username ?? null,
    expiresAt: result.expiresAt ?? null,
    demo: false,
  };
}

export async function disconnectSuunto(): Promise<void> {
  if (!SUUNTO_DEMO_MODE) {
    try {
      await invokeSupabaseFunction("suunto-oauth", { action: "disconnect" });
    } catch {
      return;
    }
  }
}

export async function fetchLatestSuuntoActivity(): Promise<SuuntoSyncPayload | null> {
  if (SUUNTO_DEMO_MODE) return null;

  try {
    const payload = await invokeSupabaseFunction<SuuntoSyncPayload>("suunto-sync", {
      action: "latest",
    });

    if (!payload?.activity || !Array.isArray(payload.samples) || payload.samples.length < 30) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
