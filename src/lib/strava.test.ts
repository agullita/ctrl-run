import { describe, expect, it } from "vitest";
import { mapStravaActivity, normalizeStravaStreams } from "./strava";

describe("normalizeStravaStreams", () => {
  it("convierte el payload key_by_type en streams alineados", () => {
    const streams = normalizeStravaStreams({
      time: { data: [0, 1, 2] },
      heartrate: { data: [120.4, 130.6, 151.2] },
    });

    expect(streams).toHaveLength(2);
    expect(streams[0].data).toEqual([0, 1, 2]);
    expect(streams[1].data).toEqual([120, 131, 151]);
  });

  it("ignora muestras sin heartrate y longitudes desiguales", () => {
    const streams = normalizeStravaStreams({
      time: { data: [0, 1, 2, 3] },
      heartrate: { data: [120, 0, 140] },
    });

    expect(streams[0].data).toEqual([0, 2]);
    expect(streams[1].data).toEqual([120, 140]);
  });

  it("genera tiempos por índice si Strava no devuelve el stream time", () => {
    const streams = normalizeStravaStreams({
      heartrate: { data: [128, 129, 130] },
    });

    expect(streams[0].data).toEqual([0, 1, 2]);
  });
});

describe("mapStravaActivity", () => {
  it("normaliza la actividad de Strava al modelo interno", () => {
    const activity = mapStravaActivity({
      id: 99,
      name: "Morning Run",
      sport_type: "Run",
      start_date: "2026-10-22T06:42:00Z",
      elapsed_time: 2400,
      distance: 7420,
      average_heartrate: 130.2,
      max_heartrate: 154,
      total_elevation_gain: 86,
      device_name: "Garmin Forerunner 965",
    });

    expect(activity.id).toBe("99");
    expect(activity.distance).toBe(7420);
    expect(activity.averageHeartrate).toBe(130.2);
    expect(activity.isDemo).toBe(false);
  });
});
