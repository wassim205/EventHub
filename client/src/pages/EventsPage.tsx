import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import type { EventStatus, EventSummary, Paginated, PaginationMeta } from "../api/types";
import { Pagination } from "../components/Pagination";
import { EventStatusBadge } from "../components/StatusBadge";
import { Alert, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from "../components/ui";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

const emptyMeta: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 1 };

export function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<EventStatus | "">("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (status) params.set("status", status);
      if (date) params.set("date", date);
      if (search.trim()) params.set("search", search.trim());

      const { data } = await api.get<Paginated<EventSummary>>(`/events?${params}`);
      setEvents(data.data);
      setMeta(data.meta);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Impossible de charger les événements."));
    } finally {
      setLoading(false);
    }
  }, [page, status, date, search]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters(next: { status?: string; date?: string; search?: string }) {
    if (next.status !== undefined) setStatus(next.status as EventStatus | "");
    if (next.date !== undefined) setDate(next.date);
    if (next.search !== undefined) setSearch(next.search);
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Événements"
        subtitle="Filtrez par statut, par date ou par intitulé."
        actions={
          <Link to="/evenements/nouveau">
            <Button variant="primary">Nouvel événement</Button>
          </Link>
        }
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Select
            aria-label="Filtrer par statut"
            value={status}
            onChange={(event) => applyFilters({ status: event.target.value })}
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="cancelled">Annulé</option>
          </Select>

          <Input
            type="date"
            aria-label="Filtrer par date"
            value={date}
            onChange={(event) => applyFilters({ date: event.target.value })}
          />

          <Input
            placeholder="Rechercher un intitulé…"
            aria-label="Rechercher"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyFilters({ search: search });
            }}
          />

          <div className="flex gap-2">
            <Button variant="primary" onClick={() => applyFilters({ search })}>
              Rechercher
            </Button>
            <Button
              onClick={() => {
                setStatus("");
                setDate("");
                setSearch("");
                setPage(1);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </Card>

      {error ? <Alert>{error}</Alert> : null}

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Chargement des événements" />
        ) : events.length === 0 ? (
          <EmptyState title="Aucun événement" description="Aucun événement ne correspond à ces critères." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Événement</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Statut</th>
                <th className="px-5 py-2.5 font-medium">Places</th>
                <th className="px-5 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-500">{event.location}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{dateFormat.format(new Date(event.eventDate))}</td>
                  <td className="px-5 py-3">
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {event.registrationsCount} / {event.maxParticipants}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/evenements/${event.id}`}>
                      <Button size="sm">Détail</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination meta={meta} onChange={setPage} />
      </Card>
    </div>
  );
}