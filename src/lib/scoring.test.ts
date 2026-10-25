import { describe, expect, it } from "vitest";
import { createMockActivityPayload } from "./mockActivity";
import { evaluateHeartRatePrecision, getVerdict } from "./scoring";
import { createProfile } from "./zones";
import type { HeartRatePoint } from "./types";

function streamFrom(heartrate: number[]): HeartRatePoint[] {
  return heartrate.map((bpm, time) => ({ time, bpm }));
}

const profile = createProfile(180, 60);
const z2 = profile.zones.z2!;
const target = (z2.min + z2.max) / 2;

describe("evaluateHeartRatePrecision", () => {
  it("awards ten points per second inside the four-bpm sweet band", () => {
    const result = evaluateHeartRatePrecision(
      streamFrom(Array(60).fill(target)),
      profile,
      "z2",
    );

    expect(result.score).toBe(600);
    expect(result.score1000).toBe(1000);
    expect(result.maxPossible).toBe(600);
    expect(result.precisionPercent).toBe(100);
    expect(result.sweetSpotSeconds).toBe(60);
    expect(result.egoAlert).toBe(false);
  });

  it("awards five points on the valid periphery outside the sweet band", () => {
    const sweetEdge = evaluateHeartRatePrecision(
      streamFrom([target + 2]),
      profile,
      "z2",
    );
    const periphery = evaluateHeartRatePrecision(
      streamFrom([z2.min + 1]),
      profile,
      "z2",
    );

    expect(sweetEdge.score).toBe(10);
    expect(periphery.score).toBe(5);
  });

  it("absorbs continuous excursions of up to fifteen seconds", () => {
    const result = evaluateHeartRatePrecision(
      streamFrom(Array(15).fill(z2.max + 4)),
      profile,
      "z2",
    );

    expect(result.penaltyPoints).toBe(0);
    expect(result.score).toBe(0);
    expect(result.graceAbsorbedSeconds).toBe(15);
  });

  it("starts penalizing after fifteen continuous seconds outside the zone", () => {
    const result = evaluateHeartRatePrecision(
      streamFrom(Array(20).fill(z2.max + 2)),
      profile,
      "z2",
    );

    expect(result.graceAbsorbedSeconds).toBe(15);
    expect(result.egoPenaltyPoints).toBe(50);
    expect(result.score).toBe(-50);
  });

  it("multiplies ego and deficit penalties by bpm distance after the grace period", () => {
    const result = evaluateHeartRatePrecision(
      streamFrom([
        ...Array(30).fill(z2.max + 2),
        target,
        ...Array(30).fill(z2.min - 2),
      ]),
      profile,
      "z2",
    );

    expect(result.egoPenaltyPoints).toBe(150);
    expect(result.deficitPenaltyPoints).toBe(60);
    expect(result.score).toBe(-200);
    expect(result.score1000).toBe(0);
    expect(result.breaches).toHaveLength(2);
  });

  it("raises the sustained ego alert after thirty consecutive seconds", () => {
    const atThreshold = evaluateHeartRatePrecision(
      streamFrom(Array(30).fill(z2.max + 3)),
      profile,
      "z2",
    );
    const overThreshold = evaluateHeartRatePrecision(
      streamFrom(Array(31).fill(z2.max + 3)),
      profile,
      "z2",
    );

    expect(atThreshold.egoAlert).toBe(false);
    expect(overThreshold.egoAlert).toBe(true);
    expect(overThreshold.longestEgo).toBe(31);
  });

  it("classifies a low-heart-rate failure as a motor deficit, not ego", () => {
    const result = evaluateHeartRatePrecision(
      streamFrom(Array(60).fill(z2.min - 3)),
      profile,
      "z2",
    );
    const verdict = getVerdict(result.score1000, result);

    expect(verdict.label).toBe("DÉFICIT DE MOTOR");
    expect(verdict.text).toContain("por debajo");
  });

  it("keeps the ego verdict when the dominant failure is above the zone", () => {
    const result = evaluateHeartRatePrecision(
      streamFrom(Array(60).fill(z2.max + 4)),
      profile,
      "z2",
    );
    const verdict = getVerdict(result.score1000, result);

    expect(verdict.label).toBe("EGO DESBOCADO");
  });

  it("evaluates the seeded demo run on the selected zone", () => {
    const payload = createMockActivityPayload();
    const result = evaluateHeartRatePrecision(payload.samples, profile, "z2");

    expect(payload.activity.elapsedTime).toBe(2700);
    expect(result.elapsedSeconds).toBe(2700);
    expect(result.config.zoneKey).toBe("z2");
    expect(result.config.zoneMin).toBe(132);
    expect(result.config.zoneMax).toBe(144);
    expect(result.config.targetBpm).toBe(138);
    expect(result.config.sweetSpotMin).toBe(136);
    expect(result.config.sweetSpotMax).toBe(140);
    expect(result.maxPossible).toBe(27000);
    expect(result.score1000).toBeGreaterThanOrEqual(0);
    expect(result.score1000).toBeLessThanOrEqual(1000);
  });
});

describe("getVerdict", () => {
  it("uses the 0–1000 precision thresholds", () => {
    expect(getVerdict(901).tone).toBe("signal");
    expect(getVerdict(900).tone).toBe("warning");
    expect(getVerdict(600).tone).toBe("warning");
    expect(getVerdict(599).tone).toBe("blood");
  });

  it("returns the exact required messages", () => {
    expect(getVerdict(950).text).toBe(
      "Control quirúrgico. Has dominado el ego.",
    );
    expect(getVerdict(750).text).toBe(
      "Fugas de control. Te has dejado llevar en las cuestas.",
    );
    expect(getVerdict(550).text).toBe(
      "Ego desbocado. Entrenamiento fallido. Has corrido para la galería, no para tu corazón.",
    );
  });
});
