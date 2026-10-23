import { ArrowUpRight, LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { StravaMark } from "./Icons";

type TerminalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost" | "danger";
  icon?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
};

const variants = {
  solid:
    "border-signal bg-signal text-black hover:bg-black hover:text-signal",
  outline:
    "border-white/20 bg-transparent text-white hover:border-signal hover:text-signal",
  ghost:
    "border-transparent bg-transparent text-white/50 hover:text-signal",
  danger:
    "border-blood-bright/60 bg-blood/10 text-blood-bright hover:bg-blood-bright hover:text-black",
};

export function TerminalButton({
  children,
  variant = "outline",
  icon,
  trailing,
  loading = false,
  className = "",
  disabled,
  type = "button",
  ...rest
}: TerminalButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`group inline-flex items-center justify-center gap-3 border px-5 py-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon
      )}
      <span>{children}</span>
      {trailing}
    </button>
  );
}

export function StravaButton({
  children = "Sincronizar con Strava",
  loading = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading || rest.disabled}
      className={`group relative inline-flex w-full items-center justify-between gap-5 border border-signal bg-signal px-5 py-4 text-black transition-colors duration-200 hover:bg-black hover:text-signal disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[320px] ${className}`}
      {...rest}
    >
      <span className="flex items-center gap-3">
        {loading ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <StravaMark className="h-4 w-4" />
        )}
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
          {loading ? "Estableciendo enlace..." : children}
        </span>
      </span>
      <span className="flex items-center gap-3 border-l border-black/20 pl-4 group-hover:border-signal/30">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] opacity-60">
          OAuth2
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}
