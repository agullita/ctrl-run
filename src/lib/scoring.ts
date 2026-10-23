import type {
  Breach,
  HeartRateSample,
  ScoreResult,
  ScoringConfig,
  StravaStream,
  Verdict,
  ZoneStatus,
} from "./types";

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  targetMin: 125,
  targetMax: 135,
  startingScore: 1000,
  belowPenalty: 1,
  abovePenalty: 2,
  redlineThreshold: 145,
  redlineAlertSeconds: 30,
};

interface RawSample {
  time: number;
  bpm: number;
}

function streamData(streams: StravaStream[], type: string): number[] {
  const stream = streams.find((candidate) => candidate.type === type);
  return Array.isArray(stream?.data) ? stream.data : [];
}

function alignToSeconds(time: number[], heartrate: number[]): RawSample[] {
  const source: RawSample[] = [];

  for (let index = 0; index < heartrate.length; index += 1) {
    const bpm = Number(heartrate[index]);
    const timestamp = time.length > 0 ? Number(time[index]) : index;

    if (Number.isFinite(bpm) && bpm > 0 && Number.isFinite(timestamp)) {
      source.push({ time: timestamp, bpm });
    }
  }

  if (source.length === 0) return [];

  source.sort((a, b) => a.time - b.time);

  const normalized: RawSample[] = [];
  const end = Math.max(0, Math.floor(source[source.length - 1].time));
  let cursor = 0;

  for (let second = 0; second <= end; second += 1) {
    while (cursor < source.length - 1 && source[cursor + 1].time <= second) {
      cursor += 1;
    }

    const current = source[cursor];
    const next = source[Math.min(cursor + 1, source.length - 1)];
    const span = next.time - current.time;
    const ratio =
      span > 0 ? Math.min(1, Math.max(0, (second - current.time) / span)) : 0;
    const bpm = current.bpm + (next.bpm - current.bpm) * ratio;

    normalized.push({ time: second, bpm: Math.round(bpm) });
  }

  return normalized;
}

function statusFor(bpm: number, config: ScoringConfig): ZoneStatus {
  if (bpm < config.targetMin) return "below";
  if (bpm <= config.targetMax) return "target";
  if (bpm > config.redlineThreshold) return "redline";
  return "above";
}

function toBreach(
  kind: Breach["kind"],
  start: number,
  end: number,
  peak: number,
  penaltyPerSecond: number,
  critical: boolean,
): Breach {
  const duration = Math.max(0, end - start);

  return {
    kind,
    start,
    end,
    duration,
    peak,
    pointsLost: duration * penaltyPerSecond,
    critical,
  };
}

export function evaluateHeartRateStream(
  streams: StravaStream[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoreResult {
  const aligned = alignToSeconds(
    streamData(streams, "time"),
    streamData(streams, "heartrate"),
  );

  if (aligned.length === 0) {
    return {
      score: 0,
      pointsLost: 0,
      elapsedSeconds: 0,
      targetSeconds: 0,
      aboveSeconds: 0,
      belowSeconds: 0,
      redlineSeconds: 0,
      targetPercent: 0,
      averageBpm: 0,
      minBpm: 0,
      maxBpm: 0,
      egoAlert: false,
      longestRedline: 0,
      redlineStart: null,
      breaches: [],
      series: [],
      config,
    };
  }

  const series: HeartRateSample[] = aligned.map((sample) => ({
    ...sample,
    status: statusFor(sample.bpm, config),
  }));

  let score = config.startingScore;
  let targetSeconds = 0;
  let aboveSeconds = 0;
  let belowSeconds = 0;
  let redlineSeconds = 0;
  let bpmTotal = 0;
  let minBpm = series[0].bpm;
  let maxBpm = series[0].bpm;
  let redlineRun = 0;
  let longestRedline = 0;
  let redlineStart: number | null = null;

  const breaches: Breach[] = [];
  let openBreach: {
    kind: Breach["kind"];
    start: number;
    peak: number;
    critical: boolean;
  } | null = null;

  const closeBreach = (end: number) => {
    if (!openBreach) return;
    const penalty =
      openBreach.kind === "ego" ? config.abovePenalty : config.belowPenalty;
    breaches.push(
      toBreach(
        openBreach.kind,
        openBreach.start,
        end,
        openBreach.peak,
        penalty,
        openBreach.critical,
      ),
    );
    openBreach = null;
  };

  for (const sample of series) {
    bpmTotal += sample.bpm;
    minBpm = Math.min(minBpm, sample.bpm);
    maxBpm = Math.max(maxBpm, sample.bpm);

    if (sample.status === "target") {
      targetSeconds += 1;
    } else if (sample.status === "below") {
      belowSeconds += 1;
      score -= config.belowPenalty;
    } else {
      aboveSeconds += 1;
      score -= config.abovePenalty;
    }

    if (sample.status === "redline") {
      redlineSeconds += 1;
      redlineRun += 1;

      if (redlineRun > longestRedline) {
        longestRedline = redlineRun;
        redlineStart = sample.time - redlineRun + 1;
      }
    } else {
      redlineRun = 0;
    }

    const kind: Breach["kind"] | null =
      sample.status === "below" ? "deficit" : sample.status === "target" ? null : "ego";

    if (kind === null) {
      closeBreach(sample.time);
      continue;
    }

    if (!openBreach || openBreach.kind !== kind) {
      closeBreach(sample.time);
      openBreach = {
        kind,
        start: sample.time,
        peak: sample.bpm,
        critical: sample.status === "redline",
      };
    } else {
      openBreach.peak = Math.max(openBreach.peak, sample.bpm);
      openBreach.critical = openBreach.critical || sample.status === "redline";
    }
  }

  closeBreach(series[series.length - 1].time + 1);

  const elapsedSeconds = series.length;
  const normalizedScore = Math.max(0, Math.round(score));

  return {
    score: normalizedScore,
    pointsLost: Math.max(0, config.startingScore - normalizedScore),
    elapsedSeconds,
    targetSeconds,
    aboveSeconds,
    belowSeconds,
    redlineSeconds,
    targetPercent: elapsedSeconds > 0 ? (targetSeconds / elapsedSeconds) * 100 : 0,
    averageBpm: Math.round(bpmTotal / elapsedSeconds),
    minBpm,
    maxBpm,
    egoAlert: longestRedline > config.redlineAlertSeconds,
    longestRedline,
    redlineStart,
    breaches,
    series,
    config,
  };
}

export function getVerdict(score: number): Verdict {
  if (score > 900) {
    return {
      label: "CONTROL QUIRÚRGICO",
      text: "Control quirúrgico. Has dominado el ego.",
      tone: "signal",
    };
  }

  if (score >= 600) {
    return {
      label: "FUGAS DE CONTROL",
      text: "Fugas de control. Te has dejado llevar en las cuestas.",
      tone: "warning",
    };
  }

  return {
    label: "EGO DESBOCADO",
    text: "Ego desbocado. Entrenamiento fallido. Has corrido para la galería, no para tu corazón.",
    tone: "blood",
  };
}
