import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventsPage } from "./pages/EventsPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { EventFormPage } from "./pages/EventFormPage";
import { ParticipantsPage } from "./pages/ParticipantsPage";
import { UsersPage } from "./pages/UsersPage";

function Protected({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <Spinner label="Vérification de la session" />;
  }
  if (!user) {
    // `state.from` permet de revenir à la page demandée après connexion.
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/** Après connexion, on revient à la page initialement demandée, sinon au tableau de bord. */
function ConnexionRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (status === "loading") {
    return <Spinner label="Vérification de la session" />;
  }
  return status === "authenticated" ? <Navigate to={from} replace /> : <LoginPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<ConnexionRoute />} />
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
        {/* Route de repli : une URL inconnue affiche une vraie page 404 plutôt
            qu'une redirection silencieuse. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}