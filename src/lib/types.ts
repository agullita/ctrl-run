export type ZoneStatus = "below" | "zone" | "sweetspot" | "above";

export type ZoneKey = "z1" | "z2" | "z3" | "z4" | "z5";

export type CalibrationMethod = "karvonen" | "manual";

export interface ZoneRange {
  min: number;
  max: number;
}

export interface ZoneProfile {
  calibrationMethod: CalibrationMethod;
  hrMax: number | null;
  hrRest: number | null;
  zones: Record<ZoneKey, ZoneRange | null>;
}

export interface UserProfile extends ZoneProfile {
  id: string | null;
  remote: boolean;
}

export interface HeartRatePoint {
  time: number;
  bpm: number;
}

export interface HeartRateSample extends HeartRatePoint {
  status: ZoneStatus;
  points: number;
  offset: number;
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

export type ActivityOrigin = "suunto" | "supabase" | "demo" | "file";

export interface ActivityPayload {
  activity: Activity;
  samples: HeartRatePoint[];
  origin: ActivityOrigin;
}

export interface ScoringConfig {
  zoneKey: ZoneKey;
  zoneLabel: string;
  zoneMin: number;
  zoneMax: number;
  targetBpm: number;
  sweetSpotMin: number;
  sweetSpotMax: number;
  maxPointsPerSecond: number;
  sweetSpotPoints: number;
  zonePoints: number;
  egoPenaltyPerBeat: number;
  deficitPenaltyPerBeat: number;
  egoAlertSeconds: number;
  graceSeconds: number;
}

export interface Breach {
  kind: "ego" | "deficit";
  start: number;
  end: number;
  duration: number;
  peak: number;
  pointsLost: number;
  excessBeats: number;
  critical: boolean;
}

export interface ScoreResult {
  score: number;
  score1000: number;
  grossPoints: number;
  penaltyPoints: number;
  sweetSpotPoints: number;
  zonePoints: number;
  egoPenaltyPoints: number;
  deficitPenaltyPoints: number;
  maxPossible: number;
  precisionPercent: number;
  elapsedSeconds: number;
  targetSeconds: number;
  sweetSpotSeconds: number;
  aboveSeconds: number;
  belowSeconds: number;
  graceAbsorbedSeconds: number;
  targetPercent: number;
  sweetSpotPercent: number;
  averageBpm: number;
  minBpm: number;
  maxBpm: number;
  egoAlert: boolean;
  longestEgo: number;
  egoStart: number | null;
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
  durationMinutes: number;
}

export interface StoredRun {
  activity: Activity;
  result: ScoreResult;
  origin: ActivityOrigin;
  syncedAt: string;
}

export interface SuuntoStatus {
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  demo: boolean;
}

export interface SuuntoSyncPayload {
  activity: Activity;
  samples: HeartRatePoint[];
  origin: "suunto" | "supabase";
}
