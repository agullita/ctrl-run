import { describe, expect, it } from "vitest";
import {
  calculateKarvonenZones,
  createManualProfile,
  createProfile,
  isProfileComplete,
  profileFromRow,
  profileToRow,
  validateBiometrics,
  validateManualZone,
} from "./zones";

describe("Karvonen zones", () => {
  it("calculates the five zones from heart rate reserve", () => {
    const zones = calculateKarvonenZones(180, 60);

    expect(zones.z1).toEqual({ min: 120, max: 132 });
    expect(zones.z2).toEqual({ min: 132, max: 144 });
    expect(zones.z3).toEqual({ min: 144, max: 156 });
    expect(zones.z4).toEqual({ min: 156, max: 168 });
    expect(zones.z5).toEqual({ min: 168, max: 180 });
  });

  it("marks a generated profile as complete", () => {
    expect(isProfileComplete(createProfile(180, 60))).toBe(true);
  });

  it("rejects invalid biometric inputs", () => {
    expect(validateBiometrics(180, 60)).toBeNull();
    expect(validateBiometrics(100, 60)).not.toBeNull();
    expect(validateBiometrics(180, 170)).not.toBeNull();
  });

  it("creates a complete manual LTHR profile with only Z2", () => {
    const profile = createManualProfile(128, 140);

    expect(profile.calibrationMethod).toBe("manual");
    expect(profile.zones.z2).toEqual({ min: 128, max: 140 });
    expect(profile.zones.z3).toBeNull();
    expect(isProfileComplete(profile)).toBe(true);
    expect(validateManualZone(128, 140)).toBeNull();
    expect(validateManualZone(140, 128)).not.toBeNull();
  });

  it("round-trips a manual profile through database columns", () => {
    const profile = createManualProfile(128, 140);
    const row = profileToRow(profile);
    const restored = profileFromRow(row as unknown as Parameters<typeof profileFromRow>[0]);

    expect(restored.calibrationMethod).toBe("manual");
    expect(restored.zones.z2).toEqual({ min: 128, max: 140 });
    expect(restored.hrMax).toBeNull();
  });
});
