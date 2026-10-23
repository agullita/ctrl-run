import { describe, expect, it } from "vitest";
import { createMockActivityPayload } from "./mockActivity";
import { evaluateHeartRateStream, getVerdict } from "./scoring";
import type { StravaStream } from "./types";

function streamFrom(heartrate: number[]): StravaStream[] {
  return [
    { type: "time", data: heartrate.map((_, index) => index) },
    { type: "heartrate", data: heartrate },
  ];
}

describe("evaluateHeartRateStream", () => {
  it("keeps a perfect score when every sample is inside the target", () => {
    const result = evaluateHeartRateStream(streamFrom(Array(60).fill(130)));

    expect(result.score).toBe(1000);
    expect(result.targetPercent).toBe(100);
    expect(result.pointsLost).toBe(0);
    expect(result.egoAlert).toBe(false);
  });

  it("applies one point below target and two points above target", () => {
    const result = evaluateHeartRateStream(
      streamFrom([...Array(10).fill(124), ...Array(10).fill(140)]),
    );

    expect(result.belowSeconds).toBe(10);
    expect(result.aboveSeconds).toBe(10);
    expect(result.score).toBe(970);
    expect(result.breaches).toHaveLength(2);
  });

  it("only raises the discipline alert after thirty consecutive redline seconds", () => {
    const atThreshold = evaluateHeartRateStream(streamFrom(Array(30).fill(150)));
    const overThreshold = evaluateHeartRateStream(streamFrom(Array(31).fill(150)));

    expect(atThreshold.egoAlert).toBe(false);
    expect(overThreshold.egoAlert).toBe(true);
    expect(overThreshold.longestRedline).toBe(31);
  });

  it("scores the seeded demo run with the expected control leak", () => {
    const payload = createMockActivityPayload();
    const result = evaluateHeartRateStream(payload.streams);

    expect(payload.activity.elapsedTime).toBe(2400);
    expect(result.score).toBe(850);
    expect(result.belowSeconds).toBe(38);
    expect(result.aboveSeconds).toBe(56);
    expect(result.longestRedline).toBe(31);
    expect(result.egoAlert).toBe(true);
  });
});

describe("getVerdict", () => {
  it("uses the required score thresholds", () => {
    expect(getVerdict(901).tone).toBe("signal");
    expect(getVerdict(900).tone).toBe("warning");
    expect(getVerdict(600).tone).toBe("warning");
    expect(getVerdict(599).tone).toBe("blood");
  });
});

describe("verdict copy", () => {
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
