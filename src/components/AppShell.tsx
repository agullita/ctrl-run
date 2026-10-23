import { useEffect, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useRun } from "../context/RunContext";
import { Logo } from "./Logo";
import { StatusDot } from "./Icons";

const navigation = [
  { number: "01", label: "Inicio", to: "/" },
  { number: "02", label: "Panel", to: "/panel" },
  { number: "03", label: "Árbitro", to: "/arbitro" },
];

function NavItems({ compact = false }: { compact?: boolean }) {
  const location = useLocation();

  return (
    <>
      {navigation.map((item) => {
        const active =
          item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`group relative flex items-center gap-2 whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-[0.17em] transition-colors sm:px-4 ${
              active ? "text-signal" : "text-white/40 hover:text-white/80"
            }`}
          >
            <span className={active ? "text-signal/60" : "text-white/20"}>
              [{item.number}]
            </span>
            {item.label}
            {!compact && (
              <span
                className={`absolute bottom-0 left-4 right-4 h-px transition-colors ${
                  active ? "bg-signal" : "bg-transparent group-hover:bg-white/20"
                }`}
              />
            )}
          </NavLink>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { connected } = useRun();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-void text-white">
      <div aria-hidden="true" className="bg-grid pointer-events-none fixed inset-0 z-0 opacity-70" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(57,255,20,0.07),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="scanlines pointer-events-none fixed inset-0 z-0 opacity-[0.018]"
      />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-void/90 backdrop-blur-xl">
          <div className="mx-auto hidden h-6 max-w-[1480px] items-center justify-between border-b border-white/[0.04] px-4 font-mono text-[8px] uppercase tracking-[0.24em] text-white/25 sm:flex sm:px-6 lg:px-10">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-2">
                <StatusDot tone="signal" pulse />
                SYS.ONLINE
              </span>
              <span>SAMPLING 1HZ</span>
              <span className="hidden lg:inline">OAUTH2 / READ,ACTIVITY:READ_ALL</span>
            </div>
            <span>CTRL+R / BUILD 0.1.0</span>
          </div>

          <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <Logo />

            <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
              <NavItems />
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 border border-white/10 bg-white/[0.02] px-3 py-2 font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/45 sm:flex">
                <StatusDot tone={connected ? "signal" : "warning"} />
                {connected ? "Strava linked" : "Demo mode"}
              </div>
              <Link
                to="/panel"
                className="hidden border border-signal/40 px-3.5 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-signal transition-colors hover:bg-signal hover:text-black sm:inline-flex"
              >
                [ Run ]
              </Link>
            </div>
          </div>

          <nav
            className="flex overflow-x-auto border-t border-white/[0.06] md:hidden"
            aria-label="Navegación móvil"
          >
            <NavItems compact />
            <div className="ml-auto flex items-center px-4">
              <StatusDot tone={connected ? "signal" : "warning"} pulse />
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-white/[0.08] bg-black/40">
          <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10">
            <div className="grid gap-6 border-b border-white/[0.06] pb-7 font-mono text-[9px] uppercase tracking-[0.15em] text-white/30 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <StatusDot tone="signal" />
                <span>Motor 1hz / precision-first</span>
              </div>
              <div className="flex items-center gap-3 md:justify-center">
                <span className="text-white/20">LAT</span> -34.6037
                <span className="text-white/20">LON</span> -58.3816
              </div>
              <div className="flex items-center gap-3 md:justify-end">
                <span>Ctrl+R © 2026</span>
                <span className="text-white/15">//</span>
                <span>Core 0.1.0</span>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-end">
              <p className="max-w-md font-mono text-[9px] uppercase leading-relaxed tracking-[0.13em] text-white/25">
                Strava es para tu ego. Ctrl+run es para tu rendimiento. La
                precisión no se negocia con la vanidad.
              </p>
              <span className="font-mono text-[8px] tracking-[0.2em] text-white/15">
                [CTRL]+[R] // RECARGA FISIOLÓGICA
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
