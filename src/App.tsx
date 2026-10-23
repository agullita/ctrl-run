import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RunProvider } from "./context/RunContext";
import { AuthCallbackPage } from "./pages/AuthCallback";
import { DashboardPage } from "./pages/Dashboard";
import { LandingPage } from "./pages/Landing";
import { RefereePage } from "./pages/Referee";

export function App() {
  return (
    <RunProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/panel" element={<DashboardPage />} />
          <Route path="/arbitro" element={<RefereePage />} />
          <Route path="/auth/strava" element={<AuthCallbackPage />} />
          <Route path="/dashboard" element={<Navigate to="/panel" replace />} />
          <Route path="/resultados" element={<Navigate to="/arbitro" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </RunProvider>
  );
}
