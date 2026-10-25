import type {
  Breach,
  HeartRatePoint,
  HeartRateSample,
  ScoreResult,
  ScoringConfig,
  Verdict,
  ZoneKey,
  ZoneProfile,
  ZoneStatus,
} from "./types";
import {
  DEFAULT_BIOMETRICS,
  calculateKarvonenZones,
  getZoneDefinition,
  getZoneRange,
  getZoneTarget,
} from "./zones";

export function buildScoringConfig(
  profile: ZoneProfile,
  zoneKey: ZoneKey = "z2",
): ScoringConfig {
  const fallbackZones = calculateKarvonenZones(
    DEFAULT_BIOMETRICS.hrMax,
    DEFAULT_BIOMETRICS.hrRest,
  );
  const range = getZoneRange(profile, zoneKey) ?? fallbackZones[zoneKey];
  const definition = getZoneDefinition(zoneKey);

  const targetBpm = getZoneTarget(range);

  return {
    zoneKey,
    zoneLabel: definition.label,
    zoneMin: range.min,
    zoneMax: range.max,
    targetBpm,
    sweetSpotMin: targetBpm - 2,
    sweetSpotMax: targetBpm + 2,
    maxPointsPerSecond: 10,
    sweetSpotPoints: 10,
    zonePoints: 5,
    egoPenaltyPerBeat: 5,
    deficitPenaltyPerBeat: 2,
    egoAlertSeconds: 30,
    graceSeconds: 15,
  };
}

function alignToSeconds(points: HeartRatePoint[]): HeartRatePoint[] {
  const source = points
    .map((point) => ({
      time: Number(point.time),
      bpm: Number(point.bpm),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.time) && Number.isFinite(point.bpm) && point.bpm > 0,
    )
    .sort((a, b) => a.time - b.time);

  if (source.length === 0) return [];

  const first = source[0].time;
  const shifted = source.map((point) => ({
    time: point.time - first,
    bpm: point.bpm,
  }));
  const end = Math.max(0, Math.floor(shifted[shifted.length - 1].time));
  const normalized: HeartRatePoint[] = [];
  let cursor = 0;

  for (let second = 0; second <= end; second += 1) {
    while (cursor < shifted.length - 1 && shifted[cursor + 1].time <= second) {
      cursor += 1;
    }

    const current = shifted[cursor];
    const next = shifted[Math.min(cursor + 1, shifted.length - 1)];
    const span = next.time - current.time;
    const ratio =
      span > 0 ? Math.min(1, Math.max(0, (second - current.time) / span)) : 0;
    const bpm = current.bpm + (next.bpm - current.bpm) * ratio;
    normalized.push({ time: second, bpm: Math.round(bpm) });
  }

  return normalized;
}

function classify(
  bpm: number,
  config: ScoringConfig,
): { status: ZoneStatus; points: number; offset: number } {
  const { zoneMin, zoneMax, sweetSpotMin, sweetSpotMax } = config;

  if (bpm > zoneMax) {
    const excess = bpm - zoneMax;
    return {
      status: "above",
      points: -(excess * config.egoPenaltyPerBeat),
      offset: excess,
    };
  }

  if (bpm < zoneMin) {
    const deficit = zoneMin - bpm;
    return {
      status: "below",
      points: -(deficit * config.deficitPenaltyPerBeat),
      offset: -deficit,
    };
  }

  const offset = bpm - config.targetBpm;

  if (bpm >= sweetSpotMin && bpm <= sweetSpotMax) {
    return { status: "sweetspot", points: config.sweetSpotPoints, offset };
  }

  return { status: "zone", points: config.zonePoints, offset };
}

export function evaluateHeartRatePrecision(
  points: HeartRatePoint[],
  profile: ZoneProfile,
  zoneKey: ZoneKey = "z2",
): ScoreResult {
  const config = buildScoringConfig(profile, zoneKey);
  const aligned = alignToSeconds(points);

  if (aligned.length === 0) {
    return {
      score: 0,
      score1000: 0,
      grossPoints: 0,
      penaltyPoints: 0,
      sweetSpotPoints: 0,
      zonePoints: 0,
      egoPenaltyPoints: 0,
      deficitPenaltyPoints: 0,
      maxPossible: 0,
      precisionPercent: 0,
      elapsedSeconds: 0,
      targetSeconds: 0,
      sweetSpotSeconds: 0,
      aboveSeconds: 0,
      belowSeconds: 0,
      graceAbsorbedSeconds: 0,
      targetPercent: 0,
      sweetSpotPercent: 0,
      averageBpm: 0,
      minBpm: 0,
      maxBpm: 0,
      egoAlert: false,
      longestEgo: 0,
      egoStart: null,
      breaches: [],
      series: [],
      config,
    };
  }

  let outsideRun = 0;
  let graceAbsorbedSeconds = 0;

  const series: HeartRateSample[] = aligned.map((point) => {
    const classification = classify(point.bpm, config);

    if (classification.status === "above" || classification.status === "below") {
      outsideRun += 1;
      const insideGrace = outsideRun <= config.graceSeconds;

      if (insideGrace) {
        graceAbsorbedSeconds += 1;
        return { ...point, ...classification, points: 0 };
      }
    } else {
      outsideRun = 0;
    }

    return { ...point, ...classification };
  });

  let grossPoints = 0;
  let penaltyPoints = 0;
  let sweetSpotPoints = 0;
  let zonePoints = 0;
  let egoPenaltyPoints = 0;
  let deficitPenaltyPoints = 0;
  let targetSeconds = 0;
  let sweetSpotSeconds = 0;
  let aboveSeconds = 0;
  let belowSeconds = 0;
  let bpmTotal = 0;
  let minBpm = series[0].bpm;
  let maxBpm = series[0].bpm;
  let egoRun = 0;
  let longestEgo = 0;
  let egoStart: number | null = null;

  const breaches: Breach[] = [];
  let open: {
    kind: Breach["kind"];
    start: number;
    peak: number;
    pointsLost: number;
    excessBeats: number;
    critical: boolean;
  } | null = null;

  const close = (end: number) => {
    if (!open) return;
    breaches.push({
      kind: open.kind,
      start: open.start,
      end,
      duration: Math.max(0, end - open.start),
      peak: open.peak,
      pointsLost: open.pointsLost,
      excessBeats: open.excessBeats,
      critical: open.critical,
    });
    open = null;
  };

  for (const sample of series) {
    bpmTotal += sample.bpm;
    minBpm = Math.min(minBpm, sample.bpm);
    maxBpm = Math.max(maxBpm, sample.bpm);

    if (sample.points >= 0) {
      grossPoints += sample.points;

      if (sample.status === "sweetspot") {
        sweetSpotPoints += sample.points;
      } else {
        zonePoints += sample.points;
      }
    } else {
      penaltyPoints += Math.abs(sample.points);

      if (sample.status === "above") {
        egoPenaltyPoints += Math.abs(sample.points);
      } else {
        deficitPenaltyPoints += Math.abs(sample.points);
      }
    }

    if (sample.status === "sweetspot") {
      targetSeconds += 1;
      sweetSpotSeconds += 1;
    } else if (sample.status === "zone") {
      targetSeconds += 1;
    } else if (sample.status === "above") {
      aboveSeconds += 1;
    } else {
      belowSeconds += 1;
    }

    if (sample.status === "above") {
      egoRun += 1;

      if (egoRun > longestEgo) {
        longestEgo = egoRun;
        egoStart = sample.time - egoRun + 1;
      }
    } else {
      egoRun = 0;
    }

    const kind: Breach["kind"] | null =
      sample.status === "above"
        ? "ego"
        : sample.status === "below"
          ? "deficit"
          : null;

    if (kind === null) {
      close(sample.time);
      continue;
    }

    const pointsLost = Math.abs(Math.min(0, sample.points));
    const excessBeats = Math.abs(sample.offset);

    if (!open || open.kind !== kind) {
      close(sample.time);
      open = {
        kind,
        start: sample.time,
        peak: sample.bpm,
        pointsLost,
        excessBeats,
        critical: false,
      };
    } else {
      open.peak = Math.max(open.peak, sample.bpm);
      open.pointsLost += pointsLost;
      open.excessBeats += excessBeats;
    }

    if (kind === "ego" && sample.time - open.start + 1 > config.egoAlertSeconds) {
      open.critical = true;
    }
  }

  close(series[series.length - 1].time + 1);

  const elapsedSeconds = series.length;
  const score = Math.round(grossPoints - penaltyPoints);
  const maxPossible = elapsedSeconds * config.maxPointsPerSecond;
  const score1000 = Math.max(
    0,
    Math.min(1000, Math.round((score / Math.max(1, maxPossible)) * 1000)),
  );

  return {
    score,
    score1000,
    grossPoints: Math.round(grossPoints),
    penaltyPoints: Math.round(penaltyPoints),
    sweetSpotPoints: Math.round(sweetSpotPoints),
    zonePoints: Math.round(zonePoints),
    egoPenaltyPoints: Math.round(egoPenaltyPoints),
    deficitPenaltyPoints: Math.round(deficitPenaltyPoints),
    maxPossible,
    precisionPercent: score1000 / 10,
    elapsedSeconds,
    targetSeconds,
    sweetSpotSeconds,
    aboveSeconds,
    belowSeconds,
    graceAbsorbedSeconds,
    targetPercent: elapsedSeconds > 0 ? (targetSeconds / elapsedSeconds) * 100 : 0,
    sweetSpotPercent:
      elapsedSeconds > 0 ? (sweetSpotSeconds / elapsedSeconds) * 100 : 0,
    averageBpm: Math.round(bpmTotal / elapsedSeconds),
    minBpm,
    maxBpm,
    egoAlert: longestEgo > config.egoAlertSeconds,
    longestEgo,
    egoStart,
    breaches,
    series,
    config,
  };
}

interface FailureProfile {
  egoPenaltyPoints: number;
  deficitPenaltyPoints: number;
  aboveSeconds: number;
  belowSeconds: number;
}

export function getVerdict(score1000: number, failure?: FailureProfile): Verdict {
  if (score1000 > 900) {
    return {
      label: "CONTROL QUIRÚRGICO",
      text: "Control quirúrgico. Has dominado el ego.",
      tone: "signal",
    };
  }

  if (score1000 >= 600) {
    return {
      label: "FUGAS DE CONTROL",
      text: "Fugas de control. Te has dejado llevar en las cuestas.",
      tone: "warning",
    };
  }

  if (failure) {
    const egoDominant =
      failure.egoPenaltyPoints > failure.deficitPenaltyPoints * 1.15 ||
      (failure.egoPenaltyPoints === 0 &&
        failure.aboveSeconds > failure.belowSeconds * 1.15);
    const deficitDominant =
      failure.deficitPenaltyPoints > failure.egoPenaltyPoints * 1.15 ||
      (failure.deficitPenaltyPoints === 0 &&
        failure.belowSeconds > failure.aboveSeconds * 1.15);

    if (deficitDominant && !egoDominant) {
      return {
        label: "DÉFICIT DE MOTOR",
        text: "Déficit de motor. Entrenamiento fallido por falta de empuje. Te has quedado por debajo de tu zona.",
        tone: "blood",
      };
    }

    if (!egoDominant && !deficitDominant) {
      return {
        label: "CONTROL ROTO",
        text: "Control roto. Has fallado por arriba y por abajo. Sin estabilidad fisiológica no hay precisión.",
        tone: "blood",
      };
    }
  }

  return {
    label: "EGO DESBOCADO",
    text: "Ego desbocado. Entrenamiento fallido. Has corrido para la galería, no para tu corazón.",
    tone: "blood",
  };
}
