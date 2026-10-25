import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RunProvider } from "./context/RunContext";
import { DashboardPage } from "./pages/Dashboard";
import { ImportActivityPage } from "./pages/ImportActivity";
import { LandingPage } from "./pages/Landing";
import { RefereePage } from "./pages/Referee";
import { OnboardingPage } from "./pages/Onboarding";
import { SuuntoCallbackPage } from "./pages/SuuntoCallback";

export function App() {
  return (
    <RunProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/panel" element={<DashboardPage />} />
          <Route path="/importar" element={<ImportActivityPage />} />
          <Route path="/arbitro" element={<RefereePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/auth/suunto/callback" element={<SuuntoCallbackPage />} />
          <Route path="/dashboard" element={<Navigate to="/panel" replace />} />
          <Route path="/resultados" element={<Navigate to="/arbitro" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </RunProvider>
  );
}
