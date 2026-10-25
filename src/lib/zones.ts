import type {
  UserProfile,
  ZoneKey,
  ZoneProfile,
  ZoneRange,
} from "./types";

export interface ZoneDefinition {
  key: ZoneKey;
  label: string;
  description: string;
  minRatio: number;
  maxRatio: number;
}

export const ZONE_DEFINITIONS: ZoneDefinition[] = [
  {
    key: "z1",
    label: "Recuperación",
    description: "Rodaje suave / descarga",
    minRatio: 0.5,
    maxRatio: 0.6,
  },
  {
    key: "z2",
    label: "Base Aeróbica",
    description: "Motor aeróbico / control",
    minRatio: 0.6,
    maxRatio: 0.7,
  },
  {
    key: "z3",
    label: "Tempo",
    description: "Ritmo sostenido / trabajo",
    minRatio: 0.7,
    maxRatio: 0.8,
  },
  {
    key: "z4",
    label: "Umbral",
    description: "Umbral láctico / presión",
    minRatio: 0.8,
    maxRatio: 0.9,
  },
  {
    key: "z5",
    label: "VO2 Máx",
    description: "Máxima capacidad / riesgo",
    minRatio: 0.9,
    maxRatio: 1,
  },
];

export const DEFAULT_BIOMETRICS = {
  hrMax: 180,
  hrRest: 60,
};

const EMPTY_ZONES: Record<ZoneKey, ZoneRange | null> = {
  z1: null,
  z2: null,
  z3: null,
  z4: null,
  z5: null,
};

export const EMPTY_PROFILE: ZoneProfile = {
  calibrationMethod: "karvonen",
  hrMax: null,
  hrRest: null,
  zones: EMPTY_ZONES,
};

export function calculateKarvonenZones(
  hrMax: number,
  hrRest: number,
): Record<ZoneKey, ZoneRange> {
  const max = Math.round(hrMax);
  const rest = Math.round(hrRest);
  const reserve = max - rest;
  const zones = {} as Record<ZoneKey, ZoneRange>;

  for (const definition of ZONE_DEFINITIONS) {
    const min = Math.round(reserve * definition.minRatio + rest);
    const zoneMax =
      definition.key === "z5"
        ? max
        : Math.round(reserve * definition.maxRatio + rest);

    zones[definition.key] = {
      min: Math.min(min, max - 1),
      max: Math.max(zoneMax, min + 1),
    };
  }

  return zones;
}

export function validateBiometrics(
  hrMax: number,
  hrRest: number,
): string | null {
  if (!Number.isFinite(hrMax) || !Number.isFinite(hrRest)) {
    return "Introduce FCM y FCR válidas.";
  }

  if (hrMax < 120 || hrMax > 230) {
    return "La FCM debe estar entre 120 y 230 bpm.";
  }

  if (hrRest < 30 || hrRest > 120) {
    return "La FCR debe estar entre 30 y 120 bpm.";
  }

  if (hrMax - hrRest < 20) {
    return "La reserva cardíaca es demasiado estrecha.";
  }

  return null;
}

export function createProfile(
  hrMax: number,
  hrRest: number,
  id: string | null = null,
  remote = false,
): UserProfile {
  return {
    id,
    calibrationMethod: "karvonen",
    hrMax: Math.round(hrMax),
    hrRest: Math.round(hrRest),
    zones: calculateKarvonenZones(hrMax, hrRest),
    remote,
  };
}

export function validateManualZone(z2Min: number, z2Max: number): string | null {
  if (!Number.isFinite(z2Min) || !Number.isFinite(z2Max)) {
    return "Introduce los dos límites de Zona 2.";
  }

  if (z2Min < 40 || z2Max > 230) {
    return "Los límites deben estar entre 40 y 230 bpm.";
  }

  if (z2Max - z2Min < 2) {
    return "El límite superior debe superar al inferior por al menos 2 bpm.";
  }

  return null;
}

export function createManualProfile(
  z2Min: number,
  z2Max: number,
  id: string | null = null,
  remote = false,
): UserProfile {
  return {
    id,
    calibrationMethod: "manual",
    hrMax: null,
    hrRest: null,
    zones: {
      ...EMPTY_ZONES,
      z2: { min: Math.round(z2Min), max: Math.round(z2Max) },
    },
    remote,
  };
}

export function isProfileComplete(profile: ZoneProfile): boolean {
  if (profile.calibrationMethod === "manual") {
    const zone = profile.zones.z2;
    return Boolean(zone && zone.max - zone.min >= 2);
  }

  if (!profile.hrMax || !profile.hrRest) return false;
  return ZONE_DEFINITIONS.every((definition) => {
    const zone = profile.zones[definition.key];
    return Boolean(zone && zone.max > zone.min);
  });
}

export function getZoneRange(
  profile: ZoneProfile,
  key: ZoneKey,
): ZoneRange | null {
  return profile.zones[key] ?? null;
}

export function getZoneDefinition(key: ZoneKey): ZoneDefinition {
  return (
    ZONE_DEFINITIONS.find((definition) => definition.key === key) ??
    ZONE_DEFINITIONS[1]
  );
}

export function getZoneTarget(range: ZoneRange): number {
  return (range.min + range.max) / 2;
}

interface ProfileRow {
  calibration_method?: "karvonen" | "manual" | null;
  hr_max: number | null;
  hr_rest: number | null;
  z1_min: number | null;
  z1_max: number | null;
  z2_min: number | null;
  z2_max: number | null;
  z3_min: number | null;
  z3_max: number | null;
  z4_min: number | null;
  z4_max: number | null;
  z5_min: number | null;
  z5_max: number | null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function profileFromRow(row: ProfileRow): ZoneProfile {
  const zones = {} as Record<ZoneKey, ZoneRange | null>;

  for (const definition of ZONE_DEFINITIONS) {
    const min = nullableNumber(row[`${definition.key}_min` as keyof ProfileRow]);
    const max = nullableNumber(row[`${definition.key}_max` as keyof ProfileRow]);
    zones[definition.key] = min !== null && max !== null ? { min, max } : null;
  }

  return {
    calibrationMethod: row.calibration_method === "manual" ? "manual" : "karvonen",
    hrMax: nullableNumber(row.hr_max),
    hrRest: nullableNumber(row.hr_rest),
    zones,
  };
}

export function profileToRow(
  profile: ZoneProfile,
): Record<string, number | string | null> {
  const row: Record<string, number | string | null> = {
    calibration_method: profile.calibrationMethod,
    hr_max: profile.hrMax,
    hr_rest: profile.hrRest,
  };

  for (const definition of ZONE_DEFINITIONS) {
    const zone = profile.zones[definition.key];
    row[`${definition.key}_min`] = zone?.min ?? null;
    row[`${definition.key}_max`] = zone?.max ?? null;
  }

  return row;
}
