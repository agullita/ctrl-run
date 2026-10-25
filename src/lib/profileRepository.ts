import { supabase } from "./supabase";
import {
  EMPTY_PROFILE,
  isProfileComplete,
  profileFromRow,
  profileToRow,
} from "./zones";
import type { StoredRun, UserProfile, ZoneProfile } from "./types";

const PROFILE_KEY = "ctrlrun:zone-profile";

const PROFILE_COLUMNS =
  "calibration_method,hr_max,hr_rest,z1_min,z1_max,z2_min,z2_max,z3_min,z3_max,z4_min,z4_max,z5_min,z5_max";

function readLocalProfile(): ZoneProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as ZoneProfile;
    return isProfileComplete(parsed) ? parsed : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

function writeLocalProfile(profile: ZoneProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    return;
  }
}

export async function loadUserProfile(userId: string | null): Promise<UserProfile> {
  const fallback = readLocalProfile();

  if (!supabase || !userId) {
    return { id: userId, ...fallback, remote: false };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return { id: userId, ...fallback, remote: false };
    }

    if (!data) {
      return { id: userId, ...EMPTY_PROFILE, remote: true };
    }

    const profile = profileFromRow(data);

    if (isProfileComplete(profile)) {
      writeLocalProfile(profile);
    }

    return { id: userId, ...profile, remote: true };
  } catch {
    return { id: userId, ...fallback, remote: false };
  }
}

export async function saveUserProfile(
  userId: string | null,
  profile: ZoneProfile,
): Promise<UserProfile> {
  writeLocalProfile(profile);

  if (!supabase || !userId) {
    return { id: userId, ...profile, remote: false };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    ...profileToRow(profile),
  });

  return { id: userId, ...profile, remote: !error };
}

export async function persistPrecisionRun(
  userId: string | null,
  run: StoredRun,
): Promise<void> {
  if (!supabase || !userId) return;

  try {
    await supabase.from("precision_runs").insert({
      user_id: userId,
      suunto_workout_key: run.origin === "suunto" ? run.activity.id : null,
      activity_name: run.activity.name,
      activity_started_at: run.activity.startedAt,
      elapsed_seconds: run.result.elapsedSeconds,
      mission_zone: run.result.config.zoneKey,
      zone_min: run.result.config.zoneMin,
      zone_max: run.result.config.zoneMax,
      target_bpm: run.result.config.targetBpm,
      score: run.result.score1000,
      gross_points: run.result.grossPoints,
      penalty_points: run.result.penaltyPoints,
      precision_percent: run.result.precisionPercent,
      target_seconds: run.result.targetSeconds,
      sweet_spot_seconds: run.result.sweetSpotSeconds,
      above_seconds: run.result.aboveSeconds,
      below_seconds: run.result.belowSeconds,
      source: run.origin,
      payload: {
        rawScore: run.result.score,
        averageBpm: run.result.averageBpm,
        maxBpm: run.result.maxBpm,
        egoAlert: run.result.egoAlert,
        breaches: run.result.breaches,
      },
    });
  } catch {
    return;
  }
}
