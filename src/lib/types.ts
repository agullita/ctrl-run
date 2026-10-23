export type ZoneStatus = "below" | "target" | "above" | "redline";

export interface HeartRateSample {
  time: number;
  bpm: number;
  status: ZoneStatus;
}

export interface Activity {
  id: string;
  name: string;
  sportType: string;
  startedAt: string;
  elapsedTime: number;
  distance: number;
  averageHeartrate: number;
  maxHeartrate: number;
  elevationGain: number;
  deviceName: string;
  isDemo: boolean;
}

export interface StravaStream {
  type: string;
  data: number[];
  series_type?: string;
  original_size?: number;
  resolution?: string;
}

export interface ActivityPayload {
  activity: Activity;
  streams: StravaStream[];
  origin: "supabase" | "local" | "strava";
}

export interface ScoringConfig {
  targetMin: number;
  targetMax: number;
  startingScore: number;
  belowPenalty: number;
  abovePenalty: number;
  redlineThreshold: number;
  redlineAlertSeconds: number;
}

export interface Breach {
  kind: "ego" | "deficit";
  start: number;
  end: number;
  duration: number;
  peak: number;
  pointsLost: number;
  critical: boolean;
}

export interface ScoreResult {
  score: number;
  pointsLost: number;
  elapsedSeconds: number;
  targetSeconds: number;
  aboveSeconds: number;
  belowSeconds: number;
  redlineSeconds: number;
  targetPercent: number;
  averageBpm: number;
  minBpm: number;
  maxBpm: number;
  egoAlert: boolean;
  longestRedline: number;
  redlineStart: number | null;
  breaches: Breach[];
  series: HeartRateSample[];
  config: ScoringConfig;
}

export interface Verdict {
  label: string;
  text: string;
  tone: "signal" | "warning" | "blood";
}

export interface Mission {
  id: string;
  code: string;
  name: string;
  objective: string;
  durationMinutes: number;
  targetMin: number;
  targetMax: number;
  baseScore: number;
  tolerance: number;
}

export interface StoredRun {
  activity: Activity;
  result: ScoreResult;
  origin: ActivityPayload["origin"];
  syncedAt: string;
}
