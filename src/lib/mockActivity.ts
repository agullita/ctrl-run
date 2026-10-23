import type { Activity, ActivityPayload, Mission } from "./types";

export const MOCK_ACTIVITY_ID = "ctrlrun-demo-001";
export const MOCK_STARTED_AT = "2026-10-22T06:42:00+02:00";

export const MISSION_01: Mission = {
  id: "mission-monk-01",
  code: "M-01",
  name: "El Monje",
  objective: "40 minutos. Target estricto: entre 125 y 135 bpm",
  durationMinutes: 40,
  targetMin: 125,
  targetMax: 135,
  baseScore: 1000,
  tolerance: 5,
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
  { duration: 6, from: 98, to: 123, floor: 94, ceiling: 124, jitter: 2.4 },
  { duration: 24, from: 120, to: 124, floor: 118, ceiling: 124, jitter: 1.6 },
  { duration: 570, from: 128, to: 130, floor: 126, ceiling: 134, jitter: 3.6 },
  { duration: 25, from: 137, to: 142, floor: 136, ceiling: 144, jitter: 2.2 },
  { duration: 495, from: 129, to: 131, floor: 126, ceiling: 134, jitter: 3.2 },
  { duration: 31, from: 147, to: 153, floor: 146, ceiling: 154, jitter: 1.4 },
  { duration: 599, from: 131, to: 129, floor: 126, ceiling: 134, jitter: 3.1 },
  { duration: 8, from: 124, to: 119, floor: 117, ceiling: 124, jitter: 1.4 },
  { duration: 642, from: 127, to: 130, floor: 126, ceiling: 134, jitter: 2.8 },
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
  const random = mulberry32(3917);
  const heartrate: number[] = [];

  for (const segment of SEGMENTS) {
    for (let index = 0; index < segment.duration; index += 1) {
      const progress = index / Math.max(1, segment.duration - 1);
      const baseline = segment.from + (segment.to - segment.from) * progress;
      const wave =
        Math.sin((heartrate.length + 4) / 8.7) * 0.8 +
        Math.sin((heartrate.length + 17) / 21.3) * 0.55;
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
  const time = heartrate.map((_, index) => index);
  const averageHeartrate =
    heartrate.reduce((total, bpm) => total + bpm, 0) / heartrate.length;

  const activity: Activity = {
    id: MOCK_ACTIVITY_ID,
    name: "Crucero de control / Auditoría 01",
    sportType: "Run",
    startedAt: MOCK_STARTED_AT,
    elapsedTime: heartrate.length,
    distance: 7420,
    averageHeartrate: Math.round(averageHeartrate * 10) / 10,
    maxHeartrate: Math.max(...heartrate),
    elevationGain: 86,
    deviceName: "Garmin Forerunner 965",
    isDemo: true,
  };

  return {
    activity,
    streams: [
      { type: "time", data: time, series_type: "time", original_size: time.length },
      {
        type: "heartrate",
        data: heartrate,
        series_type: "time",
        original_size: heartrate.length,
      },
    ],
    origin: "local",
  };
}
