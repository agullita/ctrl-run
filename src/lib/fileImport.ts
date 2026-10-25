import type { Activity, ActivityPayload, HeartRatePoint } from "./types";

export type SupportedFileFormat = "fit" | "tcx" | "gpx" | "csv";

export interface ImportedActivity {
  payload: ActivityPayload;
  format: SupportedFileFormat;
  fileName: string;
  fileSize: number;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function detectFileFormat(fileName: string): SupportedFileFormat | null {
  const extension = extensionOf(fileName);
  return extension === "fit" || extension === "tcx" || extension === "gpx" || extension === "csv"
    ? extension
    : null;
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Archivo importado";
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis =
      value > 1e12 ? value : value > 1e9 ? value * 1000 : value * 1000 + FIT_EPOCH_MS;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function distanceToMeters(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeSamples(samples: HeartRatePoint[]): HeartRatePoint[] {
  const clean = samples
    .map((sample) => ({
      time: Number(sample.time),
      bpm: Math.round(Number(sample.bpm)),
    }))
    .filter(
      (sample) =>
        Number.isFinite(sample.time) &&
        Number.isFinite(sample.bpm) &&
        sample.bpm > 20 &&
        sample.bpm < 260,
    )
    .sort((a, b) => a.time - b.time);

  if (clean.length === 0) return [];

  const first = clean[0].time;
  const output: HeartRatePoint[] = [];

  for (const sample of clean) {
    const shifted = {
      time: Math.max(0, Math.round(sample.time - first)),
      bpm: sample.bpm,
    };

    if (
      output.length === 0 ||
      shifted.time > output[output.length - 1].time ||
      shifted.bpm !== output[output.length - 1].bpm
    ) {
      output.push(shifted);
    }
  }

  return output;
}

function createActivityPayload({
  file,
  format,
  name,
  sportType,
  startedAt,
  distance,
  elevationGain,
  deviceName,
  samples,
}: {
  file: File;
  format: SupportedFileFormat;
  name?: string;
  sportType?: string;
  startedAt?: string | null;
  distance?: number;
  elevationGain?: number;
  deviceName: string;
  samples: HeartRatePoint[];
}): ActivityPayload {
  const normalized = normalizeSamples(samples);

  if (normalized.length < 2) {
    throw new Error(
      "El archivo no contiene suficientes muestras de frecuencia cardíaca.",
    );
  }

  const values = normalized.map((sample) => sample.bpm);
  const average = Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
  const elapsed = Math.max(1, normalized[normalized.length - 1].time + 1);
  const id = `file-${format}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}-${file.lastModified}`;

  const activity: Activity = {
    id,
    name: name?.trim() || baseName(file.name),
    sportType: sportType?.trim() || "Workout",
    startedAt:
      startedAt && !Number.isNaN(new Date(startedAt).getTime())
        ? new Date(startedAt).toISOString()
        : new Date().toISOString(),
    elapsedTime: elapsed,
    distance: Math.max(0, Math.round(distance ?? 0)),
    averageHeartrate: average,
    maxHeartrate: Math.max(...values),
    elevationGain: Math.max(0, Math.round(elevationGain ?? 0)),
    deviceName,
    isDemo: false,
  };

  return {
    activity,
    samples: normalized,
    origin: "file",
  };
}

async function parseFit(file: File): Promise<ActivityPayload> {
  const buffer = await file.arrayBuffer();
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const stream = Stream.fromArrayBuffer(buffer);
  const decoder = new Decoder(stream);

  if (!decoder.isFIT()) {
    throw new Error("El archivo no es un FIT válido.");
  }

  const { messages, errors } = decoder.read();
  if (errors.length > 0 && (messages.recordMesgs?.length ?? 0) === 0) {
    throw new Error("El FIT no se pudo decodificar.");
  }

  const session = messages.sessionMesgs?.[0];
  const records = messages.recordMesgs ?? [];
  const raw: Array<{ millis: number | null; index: number; bpm: number }> = [];

  records.forEach((record, index) => {
    const bpm = Number(record.heartRate);
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    const timestamp = toDate(record.timestamp);
    raw.push({ millis: timestamp?.getTime() ?? null, index, bpm });
  });

  if (raw.length < 2) {
    throw new Error(
      "Este FIT no contiene frecuencia cardíaca. Comprueba que el reloj registró pulso durante la actividad.",
    );
  }

  raw.sort((a, b) => (a.millis ?? a.index) - (b.millis ?? b.index));
  const timed = raw.every((entry) => entry.millis !== null);
  const base = timed ? raw[0].millis! : 0;

  const samples = raw.map((entry, index) => ({
    time: timed
      ? Math.max(0, Math.round((entry.millis! - base) / 1000))
      : index,
    bpm: entry.bpm,
  }));

  const startedAt = toDate(session?.startTime) ?? toDate(records[0]?.timestamp);
  const sport = typeof session?.sport === "string" ? session.sport : "Workout";

  return createActivityPayload({
    file,
    format: "fit",
    name: baseName(file.name),
    sportType: sport.charAt(0).toUpperCase() + sport.slice(1),
    startedAt: startedAt?.toISOString() ?? null,
    distance: distanceToMeters(session?.totalDistance),
    elevationGain: Number(session?.totalAscent) || 0,
    deviceName: "FIT upload",
    samples,
  });
}

function xmlText(element: Element | null | undefined, tagName: string): string | null {
  if (!element) return null;
  const found = element.getElementsByTagName(tagName)[0] ?? element.getElementsByTagNameNS("*", tagName)[0];
  return found?.textContent?.trim() ?? null;
}

function xmlNumber(element: Element | null | undefined, tagName: string): number | null {
  const text = xmlText(element, tagName);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseXml(text: string): Document {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error("El archivo XML no es válido.");
  }
  return document;
}

function parseTcx(file: File, text: string): ActivityPayload {
  const document = parseXml(text);
  const activity = document.getElementsByTagName("Activity")[0];
  const trackpoints = Array.from(document.getElementsByTagName("Trackpoint"));
  const samples: HeartRatePoint[] = [];
  const times: number[] = [];
  let distance = 0;
  let elevationGain = 0;
  let previousAltitude: number | null = null;

  trackpoints.forEach((point) => {
    const timeText = xmlText(point, "Time");
    const time = timeText ? new Date(timeText).getTime() : Number.NaN;
    const heartRate = xmlNumber(point, "Value") ?? xmlNumber(point, "HeartRateBpm");
    const pointDistance = xmlNumber(point, "DistanceMeters");
    const altitude = xmlNumber(point, "AltitudeMeters");

    if (pointDistance !== null) distance = Math.max(distance, pointDistance);
    if (altitude !== null) {
      if (previousAltitude !== null && altitude > previousAltitude) {
        elevationGain += altitude - previousAltitude;
      }
      previousAltitude = altitude;
    }

    if (Number.isFinite(time) && heartRate !== null && heartRate > 0) {
      times.push(time);
      samples.push({ time, bpm: heartRate });
    }
  });

  const firstTime = times.length > 0 ? Math.min(...times) : null;
  const relative = samples.map((sample) => ({
    time: firstTime === null ? sample.time : (sample.time - firstTime) / 1000,
    bpm: sample.bpm,
  }));

  const startedAtText = xmlText(activity, "Id");
  const startedAt = startedAtText
    ? new Date(startedAtText)
    : firstTime !== null
      ? new Date(firstTime)
      : null;

  return createActivityPayload({
    file,
    format: "tcx",
    name: baseName(file.name),
    sportType: activity?.getAttribute("Sport") ?? "Workout",
    startedAt: startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt.toISOString() : null,
    distance,
    elevationGain,
    deviceName: "TCX upload",
    samples: relative,
  });
}

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const radius = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function parseGpx(file: File, text: string): ActivityPayload {
  const document = parseXml(text);
  const trackpoints = Array.from(document.getElementsByTagName("trkpt"));
  const routePoints = document.getElementsByTagName("rtept").length;

  if (trackpoints.length === 0 && routePoints > 0) {
    throw new Error(
      "Este GPX es una ruta, no un entrenamiento. En Suunto exporta el entrenamiento como FIT, no como GPX route.",
    );
  }

  const samples: HeartRatePoint[] = [];
  const times: number[] = [];
  let distance = 0;
  let elevationGain = 0;
  let previousAltitude: number | null = null;
  let previousPosition: { lat: number; lon: number } | null = null;

  trackpoints.forEach((point) => {
    const timeText = xmlText(point, "time");
    const time = timeText ? new Date(timeText).getTime() : Number.NaN;
    const heartRateNode = point.getElementsByTagNameNS("*", "hr")[0];
    const heartRate = heartRateNode ? Number(heartRateNode.textContent) : null;
    const elevationNode = point.getElementsByTagName("ele")[0];
    const altitude = elevationNode ? Number(elevationNode.textContent) : null;
    const lat = Number(point.getAttribute("lat"));
    const lon = Number(point.getAttribute("lon"));

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      if (previousPosition) distance += haversine(previousPosition, { lat, lon });
      previousPosition = { lat, lon };
    }

    if (altitude !== null && Number.isFinite(altitude)) {
      if (previousAltitude !== null && altitude > previousAltitude) {
        elevationGain += altitude - previousAltitude;
      }
      previousAltitude = altitude;
    }

    if (Number.isFinite(time) && heartRate !== null && Number.isFinite(heartRate) && heartRate > 0) {
      times.push(time);
      samples.push({ time, bpm: heartRate });
    }
  });

  if (samples.length < 2) {
    throw new Error(
      "Este GPX no contiene frecuencia cardíaca. Exporta el entrenamiento como FIT desde Suunto.",
    );
  }

  const firstTime = times.length > 0 ? Math.min(...times) : null;
  const relative = samples.map((sample) => ({
    time: firstTime === null ? sample.time : (sample.time - firstTime) / 1000,
    bpm: sample.bpm,
  }));
  const name = xmlText(document.documentElement, "name") ?? baseName(file.name);

  return createActivityPayload({
    file,
    format: "gpx",
    name,
    sportType: xmlText(document.documentElement, "type") ?? "Workout",
    startedAt: firstTime !== null ? new Date(firstTime).toISOString() : null,
    distance,
    elevationGain,
    deviceName: "GPX upload",
    samples: relative,
  });
}

function parseCsvNumber(value: string): number {
  return Number(value.trim().replace(",", ".").replace(/[^\d.+-]/g, ""));
}

function parseCsv(file: File, text: string): ActivityPayload {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error("El CSV no contiene suficientes filas.");
  }

  const header = rows[0].toLowerCase().split(/[;,\t]/).map((cell) => cell.trim());
  const hasHeader = header.some((cell) => cell.includes("bpm") || cell.includes("heart") || cell.includes("tiempo") || cell.includes("time"));
  let timeIndex = 0;
  let bpmIndex = 1;

  if (hasHeader) {
    const heartIndex = header.findIndex((cell) => cell.includes("bpm") || cell.includes("heart") || cell.includes("pulse"));
    const foundTimeIndex = header.findIndex((cell) => cell.includes("time") || cell.includes("tiempo") || cell.includes("elapsed") || cell.includes("second"));
    if (heartIndex >= 0) bpmIndex = heartIndex;
    if (foundTimeIndex >= 0) timeIndex = foundTimeIndex;
  }

  const rowsData = hasHeader ? rows.slice(1) : rows;
  const raw = rowsData
    .map((row, index) => {
      const cells = row.split(/[;,\t]/).map((cell) => cell.trim());
      const bpm = parseCsvNumber(cells[bpmIndex] ?? "");
      const timeCell = cells[timeIndex] ?? String(index);
      const asDate = new Date(timeCell).getTime();
      const time = Number.isFinite(asDate) ? asDate : parseCsvNumber(timeCell);
      return { time, bpm, index };
    })
    .filter((entry) => Number.isFinite(entry.bpm) && entry.bpm > 0 && Number.isFinite(entry.time));

  if (raw.length < 2) {
    throw new Error("El CSV no contiene una columna válida de BPM.");
  }

  const first = raw[0].time;
  const second = raw[1].time;
  const difference = Math.abs(second - first);
  const divisor = difference > 1000 ? 1000 : 1;
  const samples = raw.map((entry) => ({
    time: (entry.time - first) / divisor,
    bpm: entry.bpm,
  }));

  return createActivityPayload({
    file,
    format: "csv",
    name: baseName(file.name),
    sportType: "Workout",
    startedAt: null,
    deviceName: "CSV upload",
    samples,
  });
}

export async function parseActivityFile(file: File): Promise<ImportedActivity> {
  const format = detectFileFormat(file.name);

  if (!format) {
    throw new Error("Formato no soportado. Usa .fit, .tcx, .gpx o .csv.");
  }

  if (file.size <= 0) {
    throw new Error("El archivo está vacío.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("El archivo supera el límite de 25 MB.");
  }

  let payload: ActivityPayload;

  if (format === "fit") {
    payload = await parseFit(file);
  } else {
    const text = await file.text();

    if (format === "tcx") payload = parseTcx(file, text);
    else if (format === "gpx") payload = parseGpx(file, text);
    else payload = parseCsv(file, text);
  }

  return {
    payload,
    format,
    fileName: file.name,
    fileSize: file.size,
  };
}
