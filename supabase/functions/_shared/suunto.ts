import {
  createClient,
  type SupabaseClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2.118.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface HeartRatePoint {
  time: number;
  bpm: number;
}

export interface SuuntoTokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  scope: string | null;
  suunto_username: string | null;
  expires_at: string | null;
}

interface SuuntoTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

interface AuthContext {
  user: User;
  admin: SupabaseClient;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(
  message: string,
  status = 400,
  detail?: unknown,
): Response {
  return json({ error: message, detail }, status);
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  return null;
}

function env(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

function readKeyDictionary(name: string): string {
  try {
    const raw = env(name);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Record<string, string>;
    const values = Object.values(parsed).filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    return values[0] ?? "";
  } catch {
    return "";
  }
}

export function getSuuntoConfig() {
  return {
    clientId: env("SUUNTO_CLIENT_ID"),
    clientSecret: env("SUUNTO_CLIENT_SECRET"),
    redirectUri: env("SUUNTO_REDIRECT_URI"),
    tokenUrl:
      env("SUUNTO_OAUTH_TOKEN_URL") ||
      "https://cloudapi-oauth.suunto.com/oauth/token",
    apiBase: env("SUUNTO_API_BASE") || "https://cloudapi.suunto.com",
    subscriptionKey: env("SUUNTO_SUBSCRIPTION_KEY"),
  };
}

export async function authenticate(req: Request): Promise<AuthContext | null> {
  const supabaseUrl = env("SUPABASE_URL");
  const anonKey =
    env("SUPABASE_ANON_KEY") ||
    env("SUPABASE_PUBLISHABLE_KEY") ||
    readKeyDictionary("SUPABASE_PUBLISHABLE_KEYS");
  const serviceKey =
    env("SUPABASE_SERVICE_ROLE_KEY") ||
    env("SUPABASE_SECRET_KEY") ||
    readKeyDictionary("SUPABASE_SECRET_KEYS");
  const authorization = req.headers.get("Authorization") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
    return null;
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) return null;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { user, admin };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function readSuuntoUsername(accessToken: string): string | null {
  const payload = decodeJwtPayload(accessToken);
  const username = payload.user ?? payload.username ?? payload.sub;
  return typeof username === "string" && username.length > 0 ? username : null;
}

async function requestToken(
  params: Record<string, string>,
): Promise<SuuntoTokenResponse> {
  const { clientId, clientSecret, tokenUrl } = getSuuntoConfig();

  if (!clientId || !clientSecret) {
    throw new Error("SUUNTO_OAUTH_NOT_CONFIGURED");
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params).toString(),
  });

  const text = await response.text();
  let body: unknown = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      `SUUNTO_TOKEN_${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }

  return body as SuuntoTokenResponse;
}

export function exchangeAuthorizationCode(code: string): Promise<SuuntoTokenResponse> {
  const { redirectUri } = getSuuntoConfig();

  if (!redirectUri) {
    throw new Error("SUUNTO_REDIRECT_URI_MISSING");
  }

  return requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

export async function saveTokenRow(
  admin: SupabaseClient,
  userId: string,
  token: SuuntoTokenResponse,
): Promise<SuuntoTokenRow> {
  const expiresAt =
    typeof token.expires_in === "number"
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

  const row = {
    user_id: userId,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    token_type: token.token_type ?? "bearer",
    scope: token.scope ?? "workout",
    suunto_username: readSuuntoUsername(token.access_token),
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("suunto_tokens").upsert(row);
  if (error) throw new Error(`SUUNTO_TOKEN_STORE_FAILED: ${error.message}`);

  return row;
}

export async function getTokenRow(
  admin: SupabaseClient,
  userId: string,
): Promise<SuuntoTokenRow | null> {
  const { data, error } = await admin
    .from("suunto_tokens")
    .select(
      "user_id,access_token,refresh_token,token_type,scope,suunto_username,expires_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SuuntoTokenRow;
}

export async function ensureFreshToken(
  admin: SupabaseClient,
  row: SuuntoTokenRow,
): Promise<SuuntoTokenRow> {
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillValid = expiresAt > Date.now() + 60_000;

  if (stillValid || !row.refresh_token) return row;

  const refreshed = await requestToken({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
  });

  const saved = await saveTokenRow(admin, row.user_id, refreshed);
  return saved;
}

export async function suuntoApi<T>(
  path: string,
  accessToken: string,
  accept = "application/json",
): Promise<T> {
  const { apiBase, subscriptionKey } = getSuuntoConfig();

  if (!subscriptionKey) {
    throw new Error("SUUNTO_SUBSCRIPTION_KEY_MISSING");
  }

  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      Accept: accept,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`SUUNTO_API_${response.status}: ${detail}`);
  }

  if (accept === "application/octet-stream") {
    return (await response.arrayBuffer()) as T;
  }

  return (await response.json()) as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function workoutList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)));
  }

  const record = asRecord(payload);
  if (!record) return [];

  for (const key of ["payload", "workouts", "data", "items"]) {
    if (Array.isArray(record[key])) {
      return record[key]
        .filter((item): item is Record<string, unknown> => Boolean(asRecord(item)));
    }
  }

  return [];
}

function workoutTime(workout: Record<string, unknown>): number {
  return (
    asNumber(workout.stopTime) ??
    asNumber(workout.startTime) ??
    asNumber(workout.lastModified) ??
    0
  );
}

export function findLatestWorkout(payload: unknown): Record<string, unknown> | null {
  const list = workoutList(payload);
  if (list.length === 0) return null;
  return [...list].sort((a, b) => workoutTime(b) - workoutTime(a))[0];
}

export function workoutKey(workout: Record<string, unknown>): string | null {
  const value =
    workout.workoutKey ??
    workout.workoutId ??
    workout.key ??
    workout.id;
  return value === undefined || value === null ? null : String(value);
}

function streakPoints(workout: Record<string, unknown>): unknown[] {
  const extensions = Array.isArray(workout.extensions) ? workout.extensions : [];

  for (const extension of extensions) {
    const record = asRecord(extension);
    if (!record) continue;

    const type = String(record.type ?? "").toLowerCase();
    if (!type.includes("heartrate") && !type.includes("heart_rate")) continue;

    const points = Array.isArray(record.points)
      ? record.points
      : Array.isArray(record.data)
        ? record.data
        : null;

    if (points && points.length > 1) return points;
  }

  return [];
}

export function extractHeartRateSamples(
  workout: Record<string, unknown>,
): HeartRatePoint[] {
  const points = streakPoints(workout);
  const samples: Array<{ rawTime: number; bpm: number; index: number }> = [];

  points.forEach((point, index) => {
    if (typeof point === "number") {
      samples.push({ rawTime: index, bpm: point, index });
      return;
    }

    const record = asRecord(point);
    if (!record) return;

    const bpm = asNumber(record.value ?? record.bpm ?? record.hr ?? record.heartRate);
    if (bpm === null || bpm <= 0) return;

    const rawTime =
      asNumber(record.timestamp ?? record.time ?? record.t ?? record.offset) ??
      index;

    samples.push({ rawTime, bpm, index });
  });

  if (samples.length === 0) return [];

  samples.sort((a, b) => a.rawTime - b.rawTime || a.index - b.index);
  const baseTime = samples[0].rawTime;
  const span = samples[samples.length - 1].rawTime - baseTime;
  const totalTime = asNumber(workout.totalTime) ?? 0;
  const divisor =
    span > 100_000 || (totalTime > 0 && span / totalTime > 20) ? 1000 : 1;

  return samples
    .map((sample) => ({
      time: Math.max(0, Math.round((sample.rawTime - baseTime) / divisor)),
      bpm: Math.round(sample.bpm),
    }))
    .filter((sample, index, list) => index === 0 || sample.time !== list[index - 1].time);
}

export function mapWorkout(
  workout: Record<string, unknown>,
  samples: HeartRatePoint[],
) {
  const key = workoutKey(workout) ?? "suunto-unknown";
  const startTime = asNumber(workout.startTime);
  const hrdata = asRecord(workout.hrdata);
  const elapsed = Math.round(asNumber(workout.totalTime) ?? samples.length);
  const values = samples.map((sample) => sample.bpm);
  const average =
    asNumber(hrdata?.workoutAvgHR) ??
    (values.length > 0
      ? Math.round(values.reduce((total, bpm) => total + bpm, 0) / values.length)
      : 0);
  const max = asNumber(hrdata?.workoutMaxHR) ?? (values.length > 0 ? Math.max(...values) : 0);

  return {
    id: key,
    name:
      typeof workout.workoutName === "string" && workout.workoutName.length > 0
        ? workout.workoutName
        : "Suunto workout",
    sportType:
      typeof workout.activityName === "string"
        ? workout.activityName
        : "Suunto workout",
    startedAt: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
    elapsedTime: Math.max(1, elapsed),
    distance: asNumber(workout.totalDistance) ?? 0,
    averageHeartrate: average,
    maxHeartrate: max,
    elevationGain: asNumber(workout.totalAscent) ?? 0,
    deviceName: "Suunto Cloud API",
    isDemo: false,
  };
}

export function workoutExtensionsPath(key: string): string {
  const encoded = encodeURIComponent(key);
  return `/v3/workouts/${encoded}?extensions=HeartrateStreamExtension,SummaryExtension`;
}

export function workoutListPath(): string {
  return "/v3/workouts?limit=1";
}
