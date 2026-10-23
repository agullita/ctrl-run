import { createMockActivityPayload, MOCK_ACTIVITY_ID } from "./mockActivity";
import { isSupabaseConfigured, supabase } from "./supabase";
import {
  canReachStravaBackend,
  fetchLatestStravaActivity,
  fetchStravaActivityStreams,
  getStravaAccessToken,
  mapStravaActivity,
  normalizeStravaStreams,
} from "./strava";
import type { StravaActivityApi } from "./strava";
import type {
  Activity,
  ActivityPayload,
  ScoreResult,
  StravaStream,
} from "./types";

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

interface StreamRow {
  time_seconds: number[];
  heartrate: number[];
}

interface ActivityRow {
  id: string;
  name: string;
  sport_type: string;
  started_at: string;
  elapsed_time: number;
  distance: number | string;
  average_heartrate: number | string | null;
  max_heartrate: number | null;
  elevation_gain: number | string | null;
  device_name: string | null;
  is_demo: boolean;
  activity_streams: StreamRow | StreamRow[] | null;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapActivityRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    sportType: row.sport_type,
    startedAt: row.started_at,
    elapsedTime: row.elapsed_time,
    distance: toNumber(row.distance),
    averageHeartrate: toNumber(row.average_heartrate),
    maxHeartrate: toNumber(row.max_heartrate),
    elevationGain: toNumber(row.elevation_gain),
    deviceName: row.device_name ?? "Strava",
    isDemo: row.is_demo,
  };
}

async function fetchFromSupabase(): Promise<ActivityPayload | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("activities")
      .select(
        "id,name,sport_type,started_at,elapsed_time,distance,average_heartrate,max_heartrate,elevation_gain,device_name,is_demo,activity_streams(time_seconds,heartrate)",
      )
      .eq("id", MOCK_ACTIVITY_ID)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as ActivityRow;
    const streamRow = Array.isArray(row.activity_streams)
      ? row.activity_streams[0]
      : row.activity_streams;

    if (
      !streamRow ||
      !Array.isArray(streamRow.time_seconds) ||
      !Array.isArray(streamRow.heartrate) ||
      streamRow.heartrate.length === 0
    ) {
      return null;
    }

    const streams: StravaStream[] = [
      {
        type: "time",
        data: streamRow.time_seconds,
        series_type: "time",
        original_size: streamRow.time_seconds.length,
      },
      {
        type: "heartrate",
        data: streamRow.heartrate,
        series_type: "time",
        original_size: streamRow.heartrate.length,
      },
    ];

    return { activity: mapActivityRow(row), streams, origin: "supabase" };
  } catch {
    return null;
  }
}

async function fetchFromStravaEdge(
  accessToken: string,
): Promise<ActivityPayload | null> {
  if (!supabase) return null;

  try {
    const latestResponse = await supabase.functions.invoke("strava", {
      body: { action: "latest", accessToken },
    });

    if (latestResponse.error || !latestResponse.data) return null;

    const activity = mapStravaActivity(
      latestResponse.data as StravaActivityApi,
    );

    const streamResponse = await supabase.functions.invoke("strava", {
      body: {
        action: "streams",
        accessToken,
        activityId: Number(activity.id),
      },
    });

    if (streamResponse.error || !streamResponse.data) return null;

    const streams = normalizeStravaStreams(
      streamResponse.data as Parameters<typeof normalizeStravaStreams>[0],
    );
    const heartrate = streams.find((stream) => stream.type === "heartrate");
    if (!heartrate || heartrate.data.length < 30) return null;

    return { activity, streams, origin: "strava" };
  } catch {
    return null;
  }
}

async function fetchFromStrava(): Promise<ActivityPayload | null> {
  const accessToken = getStravaAccessToken();
  if (!accessToken || !canReachStravaBackend()) return null;

  if (isSupabaseConfigured) {
    const edgePayload = await fetchFromStravaEdge(accessToken);
    if (edgePayload) return edgePayload;
  }

  try {
    const latest = await fetchLatestStravaActivity(accessToken);
    if (!latest) return null;

    const streams = await fetchStravaActivityStreams(accessToken, latest.id);
    const heartrate = streams.find((stream) => stream.type === "heartrate");
    if (!heartrate || heartrate.data.length < 30) return null;

    return {
      activity: latest,
      streams,
      origin: "strava",
    };
  } catch (error) {
    console.warn("[ctrl+run] Strava no disponible, usando fallback:", error);
    return null;
  }
}

export async function fetchLatestActivityPayload(): Promise<ActivityPayload> {
  const fromStrava = await fetchFromStrava();
  if (fromStrava) return fromStrava;

  const fromDatabase = await fetchFromSupabase();
  if (fromDatabase) return fromDatabase;

  await delay(900);
  return createMockActivityPayload();
}

export async function persistEvaluation(
  activityId: string,
  result: ScoreResult,
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from("evaluations").insert({
      activity_id: activityId,
      score: result.score,
      verdict: result.egoAlert ? "ego_alert" : "audited",
      points_lost: result.pointsLost,
      payload: {
        targetPercent: result.targetPercent,
        aboveSeconds: result.aboveSeconds,
        belowSeconds: result.belowSeconds,
        redlineSeconds: result.redlineSeconds,
        longestRedline: result.longestRedline,
        averageBpm: result.averageBpm,
        maxBpm: result.maxBpm,
        breaches: result.breaches,
      },
    });
  } catch {
    return;
  }
}
