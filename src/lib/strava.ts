import type { Activity, StravaStream } from "./types";

const CONNECTION_KEY = "ctrlrun:strava-connected";
const OAUTH_STATE_KEY = "ctrlrun:oauth-state";
const TOKEN_KEY = "ctrlrun:strava-token";

const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID?.trim() ?? "";
const demoFlag =
  import.meta.env.VITE_STRAVA_DEMO_MODE?.trim() ??
  import.meta.env.VITE_STRAVA_DEMO?.trim() ??
  "true";
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const STRAVA_CLIENT_ID = clientId;
export const STRAVA_DEMO_MODE =
  demoFlag !== "false" || !clientId || !supabaseUrl;

export function isStravaOAuthConfigured(): boolean {
  return Boolean(clientId && supabaseUrl);
}

export function canReachStravaBackend(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getRedirectUri(): string {
  const configured = import.meta.env.VITE_STRAVA_REDIRECT_URI?.trim();
  return configured || `${window.location.origin}/auth/strava`;
}

export function createOAuthState(): string {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function buildStravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state: createOAuthState(),
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export function startStravaOAuth(): "oauth" | "demo" {
  if (STRAVA_DEMO_MODE) {
    localStorage.setItem(CONNECTION_KEY, "demo");
    return "demo";
  }

  const state = createOAuthState();
  localStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });

  window.location.assign(
    `https://www.strava.com/oauth/authorize?${params.toString()}`,
  );
  return "oauth";
}

export function isStravaConnected(): boolean {
  return localStorage.getItem(CONNECTION_KEY) !== null;
}

export function connectStravaSession(): void {
  localStorage.setItem(CONNECTION_KEY, STRAVA_DEMO_MODE ? "demo" : "oauth");
}

export function disconnectStrava(): void {
  localStorage.removeItem(CONNECTION_KEY);
  localStorage.removeItem(OAUTH_STATE_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function consumeOAuthState(): string | null {
  const state = localStorage.getItem(OAUTH_STATE_KEY);
  localStorage.removeItem(OAUTH_STATE_KEY);
  return state;
}

interface KeyedStream {
  data: number[];
  series_type?: string;
  original_size?: number;
  resolution?: string;
}

export interface StravaActivityApi {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  device_name?: string;
}

export interface StravaTokenPayload {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

type StravaAction = "exchange" | "refresh" | "latest" | "streams";

export function normalizeStravaStreams(
  raw: Record<string, KeyedStream | undefined>,
): StravaStream[] {
  const heartrate = Array.isArray(raw.heartrate?.data) ? raw.heartrate.data : [];
  const time = Array.isArray(raw.time?.data)
    ? raw.time.data
    : heartrate.map((_, index) => index);
  const length = Math.min(time.length, heartrate.length);
  const alignedTime: number[] = [];
  const alignedHeartrate: number[] = [];

  for (let index = 0; index < length; index += 1) {
    const timestamp = Number(time[index]);
    const bpm = Number(heartrate[index]);

    if (Number.isFinite(timestamp) && Number.isFinite(bpm) && bpm > 0) {
      alignedTime.push(timestamp);
      alignedHeartrate.push(Math.round(bpm));
    }
  }

  return [
    {
      type: "time",
      data: alignedTime,
      series_type: "time",
      original_size: alignedTime.length,
    },
    {
      type: "heartrate",
      data: alignedHeartrate,
      series_type: "time",
      original_size: alignedHeartrate.length,
    },
  ];
}

export function mapStravaActivity(raw: StravaActivityApi): Activity {
  return {
    id: String(raw.id),
    name: raw.name,
    sportType: raw.sport_type ?? raw.type ?? "Run",
    startedAt: raw.start_date,
    elapsedTime: raw.elapsed_time,
    distance: raw.distance,
    averageHeartrate: raw.average_heartrate ?? 0,
    maxHeartrate: raw.max_heartrate ?? 0,
    elevationGain: raw.total_elevation_gain ?? 0,
    deviceName: raw.device_name ?? "Strava",
    isDemo: false,
  };
}

async function callStravaFunction<T>(
  action: StravaAction,
  body: Record<string, unknown> = {},
): Promise<T> {
  if (!canReachStravaBackend()) {
    throw new Error("SUPABASE_BACKEND_NOT_CONFIGURED");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/strava`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ action, ...body }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `STRAVA_FUNCTION_${response.status}`);
  }

  return (await response.json()) as T;
}

export function exchangeStravaCode(code: string): Promise<StravaTokenPayload> {
  return callStravaFunction<StravaTokenPayload>("exchange", { code });
}

export function saveStravaTokens(payload: StravaTokenPayload): void {
  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: payload.expires_at,
    }),
  );
  connectStravaSession();
}

export function getStravaAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      accessToken?: string;
      expiresAt?: number;
    };
    if (!parsed.accessToken) return null;
    if (parsed.expiresAt && parsed.expiresAt * 1000 < Date.now()) return null;
    return parsed.accessToken;
  } catch {
    return null;
  }
}

export async function fetchLatestStravaActivity(
  accessToken: string,
): Promise<Activity | null> {
  const raw = await callStravaFunction<StravaActivityApi | null>("latest", {
    accessToken,
  });
  return raw ? mapStravaActivity(raw) : null;
}

export async function fetchStravaActivityStreams(
  accessToken: string,
  activityId: string,
): Promise<StravaStream[]> {
  const raw = await callStravaFunction<Record<string, KeyedStream>>("streams", {
    accessToken,
    activityId: Number(activityId),
  });
  return normalizeStravaStreams(raw);
}
