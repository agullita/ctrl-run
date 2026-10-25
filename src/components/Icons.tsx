import type { ReactNode } from "react";

export function CornerMarks({
  tone = "signal",
}: {
  tone?: "signal" | "blood" | "neutral";
}) {
  const color =
    tone === "blood"
      ? "border-blood-bright/70"
      : tone === "neutral"
        ? "border-white/25"
        : "border-signal/55";

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className={`absolute -left-px -top-px h-2.5 w-2.5 border-l border-t ${color}`} />
      <span className={`absolute -right-px -top-px h-2.5 w-2.5 border-r border-t ${color}`} />
      <span className={`absolute -bottom-px -left-px h-2.5 w-2.5 border-b border-l ${color}`} />
      <span className={`absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r ${color}`} />
    </span>
  );
}

export function BracketLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[9px] uppercase leading-none tracking-[0.2em] text-white/40 ${className}`}
    >
      [{children}]
    </span>
  );
}

export function StatusDot({
  tone = "signal",
  pulse = false,
  className = "",
}: {
  tone?: "signal" | "warning" | "blood" | "ash";
  pulse?: boolean;
  className?: string;
}) {
  const colors = {
    signal: "bg-signal shadow-[0_0_8px_rgba(57,255,20,0.8)]",
    warning: "bg-warning shadow-[0_0_8px_rgba(229,255,61,0.6)]",
    blood: "bg-blood-bright shadow-[0_0_8px_rgba(255,43,28,0.7)]",
    ash: "bg-white/30",
  };

  return (
    <span
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 shrink-0 ${colors[tone]} ${
        pulse ? "animate-pulse" : ""
      } ${className}`}
    />
  );
}

export function SuuntoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.4 4.6-4.6 2.4 2.4-4.6 4.6-2.4Z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CrosshairIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      className={className}
    >
      <circle cx="12" cy="12" r="6" />
      <path d="M12 1v6M12 17v6M1 12h6M17 12h6" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
