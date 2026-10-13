import { Link, useLocation } from "react-router-dom";
import { Button, Card } from "../components/ui";

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">Erreur 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Page introuvable</h1>
        <p className="mt-2 text-sm text-slate-600">
          L'adresse demandée ne correspond à aucune page de l'application. Vérifiez la
          saisie, ou revenez à une des pages listées ci-dessous.
        </p>

        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
          {location.pathname}
        </p>

        <div className="mt-6 flex justify-center gap-2">
          <Link to="/">
            <Button variant="primary">Tableau de bord</Button>
          </Link>
          <Link to="/evenements">
            <Button>Événements</Button>
          </Link>
          <Link to="/participants">
            <Button>Participants</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}