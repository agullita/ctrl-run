import type { Activity, ActivityPayload, Mission } from "./types";

export const MOCK_ACTIVITY_ID = "suunto-demo-2700";
export const MOCK_STARTED_AT = "2026-10-25T07:12:00+01:00";
export const MISSION_01: Mission = {
  id: "mission-monk-01",
  code: "M-01",
  name: "El Monje",
  durationMinutes: 45,
};

interface HeartRateSegment {
  duration: number;
  from: number;
  to: number;
  floor: number;
  ceiling: number;
  jitter: number;
}

const SEGMENTS: HeartRateSegment[] = [
  { duration: 90, from: 110, to: 123, floor: 108, ceiling: 124, jitter: 2.2 },
  { duration: 90, from: 124, to: 129, floor: 123, ceiling: 129, jitter: 1.7 },
  { duration: 600, from: 134, to: 136, floor: 130, ceiling: 139, jitter: 2.4 },
  { duration: 60, from: 141, to: 146, floor: 141, ceiling: 147, jitter: 1.6 },
  { duration: 480, from: 133, to: 137, floor: 130, ceiling: 139, jitter: 2.5 },
  { duration: 60, from: 129, to: 124, floor: 123, ceiling: 129, jitter: 1.4 },
  { duration: 480, from: 132, to: 138, floor: 130, ceiling: 139, jitter: 2.6 },
  { duration: 60, from: 142, to: 149, floor: 142, ceiling: 150, jitter: 1.4 },
  { duration: 420, from: 134, to: 136, floor: 131, ceiling: 138, jitter: 2.2 },
  { duration: 60, from: 129, to: 123, floor: 122, ceiling: 129, jitter: 1.4 },
  { duration: 300, from: 135, to: 136, floor: 132, ceiling: 138, jitter: 1.8 },
];

function mulberry32(seed: number): () => number {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMockHeartRate(): number[] {
  const random = mulberry32(2501);
  const heartrate: number[] = [];

  for (const segment of SEGMENTS) {
    for (let index = 0; index < segment.duration; index += 1) {
      const progress = index / Math.max(1, segment.duration - 1);
      const baseline = segment.from + (segment.to - segment.from) * progress;
      const wave =
        Math.sin((heartrate.length + 3) / 7.4) * 0.8 +
        Math.sin((heartrate.length + 19) / 23.8) * 0.6;
      const noise = (random() * 2 - 1) * segment.jitter;
      const bpm = Math.round(
        Math.min(segment.ceiling, Math.max(segment.floor, baseline + wave + noise)),
      );
      heartrate.push(bpm);
    }
  }

  return heartrate;
}

export function createMockActivityPayload(): ActivityPayload {
  const heartrate = buildMockHeartRate();
  const averageHeartrate =
    heartrate.reduce((total, bpm) => total + bpm, 0) / heartrate.length;

  const activity: Activity = {
    id: MOCK_ACTIVITY_ID,
    name: "Zona 2 / Control de motor",
    sportType: "Running",
    startedAt: MOCK_STARTED_AT,
    elapsedTime: heartrate.length,
    distance: 8240,
    averageHeartrate: Math.round(averageHeartrate * 10) / 10,
    maxHeartrate: Math.max(...heartrate),
    elevationGain: 94,
    deviceName: "Suunto Race S",
    isDemo: true,
  };

  return {
    activity,
    samples: heartrate.map((bpm, time) => ({ time, bpm })),
    origin: "demo",
  };
}
