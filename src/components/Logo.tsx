import { Link } from "react-router-dom";

function PixelReload({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="square"
      strokeLinejoin="miter"
      shapeRendering="crispEdges"
    >
      <path d="M9.4 3.1A4.2 4.2 0 1 0 10.1 7.2" />
      <path d="M8.1 1.5h2.7v2.7" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Ctrl+run — inicio"
      className="group relative inline-flex items-center gap-2.5 sm:gap-3"
    >
      <span className="flex items-center gap-1.5">
        <span className="keycap h-8 w-12 font-mono text-[8.5px] font-bold tracking-[0.16em] sm:h-9 sm:w-[58px] sm:text-[9.5px]">
          CTRL
        </span>
        <span aria-hidden="true" className="font-mono text-[10px] text-signal/50">
          +
        </span>
        <span className="keycap relative h-8 w-8 sm:h-9 sm:w-9">
          <span className="font-mono text-sm font-bold leading-none">R</span>
          <PixelReload className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-signal/85" />
        </span>
      </span>

      <span aria-hidden="true" className="h-7 w-px bg-white/15 sm:h-8" />

      {!compact && (
        <span className="font-display text-lg font-semibold lowercase leading-none tracking-[-0.03em] text-white sm:text-xl">
          Ctrl<span className="text-signal">+</span>run
        </span>
      )}

      <svg
        aria-hidden="true"
        viewBox="0 0 240 14"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-2 left-0 h-3.5 w-full text-blood-bright"
      >
        <path
          d="M0 8h36l4-5 5 9 5-11 4 7h28l5-3 4 6 3-3h44l4-4 5 8 4-4h6l4-2 4 4 4-6 4 8 4-4h50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="miter"
          opacity="0.8"
        />
      </svg>
    </Link>
  );
}
