import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import type { DashboardStats } from "../api/types";
import { Alert, Card, PageHeader, Spinner } from "../components/ui";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ data: DashboardStats }>("/dashboard")
      .then(({ data }) => setStats(data.data))
      .catch((fetchError) => setError(getErrorMessage(fetchError, "Impossible de charger le tableau de bord.")));
  }, []);

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble des événements et des inscriptions." />

      {error ? <Alert>{error}</Alert> : null}
      {!stats && !error ? <Spinner label="Chargement des statistiques" /> : null}

      {stats ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Événements" value={stats.totals.events} hint={`${stats.totals.draftEvents} brouillon(s)`} />
            <StatCard label="Événements publiés" value={stats.totals.publishedEvents} hint={`${stats.totals.cancelledEvents} annulé(s)`} />
            <StatCard label="Inscriptions du jour" value={stats.totals.registrationsToday} />
            <StatCard label="Participants" value={stats.totals.participants} />
          </div>

          <Card>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-medium text-slate-900">Top 5 des événements les plus remplis</h2>
              <p className="text-sm text-slate-500">Les inscriptions annulées ne sont pas comptabilisées.</p>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Événement</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Inscriptions</th>
                  <th className="px-5 py-2.5 font-medium">Remplissage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.topEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-5 py-3">
                      <Link to={`/evenements/${event.id}`} className="font-medium text-brand-600 hover:underline">
                        {event.title}
                      </Link>
                      <p className="text-xs text-slate-500">{event.location}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{dateFormat.format(new Date(event.eventDate))}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {event.registrationsCount} / {event.maxParticipants}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.min(100, event.fillRate)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">{event.fillRate} %</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {stats.topEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      Aucun événement à afficher.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}
    </div>
  );
}