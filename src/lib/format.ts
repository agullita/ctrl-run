import type { Verdict, ZoneStatus } from "./types";

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .toUpperCase();
}

export function formatTime(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number): string {
  return formatClock(totalSeconds);
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} KM`;
}

export function formatBpm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function zoneLabel(status: ZoneStatus): string {
  if (status === "sweetspot") return "SWEET BAND";
  if (status === "zone") return "EN ZONA 2";
  if (status === "below") return "DÉFICIT";
  return "EXCESO DE EGO";
}

export const verdictToneClass: Record<Verdict["tone"], string> = {
  signal: "text-signal",
  warning: "text-warning",
  blood: "text-blood-bright",
};

export const verdictBorderClass: Record<Verdict["tone"], string> = {
  signal: "border-signal/45 bg-signal/[0.04]",
  warning: "border-warning/45 bg-warning/[0.04]",
  blood: "border-blood-bright/50 bg-blood/[0.08]",
};
