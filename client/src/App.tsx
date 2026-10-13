import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventsPage } from "./pages/EventsPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { EventFormPage } from "./pages/EventFormPage";
import { ParticipantsPage } from "./pages/ParticipantsPage";
import { UsersPage } from "./pages/UsersPage";

function Protected({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return <Spinner label="Vérification de la session" />;
  }
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function App() {
  const { status } = useAuth();

  return (
    <Routes>
      <Route
        path="/connexion"
        element={status === "authenticated" ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="evenements" element={<EventsPage />} />
        <Route path="evenements/nouveau" element={<EventFormPage />} />
        <Route path="evenements/:id" element={<EventDetailPage />} />
        <Route path="evenements/:id/modifier" element={<EventFormPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route
          path="utilisateurs"
          element={
            <Protected adminOnly>
              <UsersPage />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}