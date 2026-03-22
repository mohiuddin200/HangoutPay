import { Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TripPage } from "./pages/TripPage";
import { SettlementPage } from "./pages/SettlementPage";
import { SetupUsernamePage } from "./pages/SetupUsernamePage";
import { Layout } from "./components/Layout";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/LoadingScreen";
import { usePWA } from "./hooks/usePWA";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  usePWA();
  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="setup-username" element={<SetupUsernamePage />} />
          <Route path="trip/:tripId" element={<TripPage />} />
          <Route path="trip/:tripId/settle" element={<SettlementPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
