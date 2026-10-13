import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import type {
  EventDetail,
  EventStatus,
  ParticipantSummary,
  RegistrationStatus,
} from "../api/types";
import { EventStatusBadge, RegistrationStatusBadge } from "../components/StatusBadge";
import { NotFoundPage } from "./NotFoundPage";
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, Spinner } from "../components/ui";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusActions: Record<EventStatus, Array<{ to: EventStatus; label: string; variant: "primary" | "danger" | "secondary" }>> = {
  draft: [{ to: "published", label: "Publier", variant: "primary" }],
  published: [{ to: "cancelled", label: "Annuler l'événement", variant: "danger" }],
  cancelled: [{ to: "draft", label: "Remettre en brouillon", variant: "secondary" }],
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || !UUID_PATTERN.test(id)) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<{ data: EventDetail }>(`/events/${id}`);
      setEvent(data.data);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Impossible de charger l'événement."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(action: () => Promise<void>) {
    setError("");
    setNotice("");
    try {
      await action();
      await load();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  }

  const changeStatus = (status: EventStatus) =>
    runAction(async () => {
      await api.patch(`/events/${id}/status`, { status });
      setNotice(status === "cancelled" ? "Toutes les inscriptions ont été annulées." : "Statut mis à jour.");
    });

  const changeRegistrationStatus = (registrationId: string, status: RegistrationStatus) =>
    runAction(async () => {
      await api.patch(`/registrations/${registrationId}/status`, { status });
    });

  // Le segment `:id` accepte n'importe quelle chaîne. Un identifiant mal formé ne
// peut pas désigner un événement : mieux vaut la page 404 qu'une erreur de
// validation brute.
if (!id || !UUID_PATTERN.test(id)) {
  return <NotFoundPage />;
}

if (loading && !event) {
    return <Spinner label="Chargement de l'événement" />;
  }

  if (!event) {
    return (
      <div>
        {error ? <Alert>{error}</Alert> : null}
        <Link to="/evenements" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={event.title}
        subtitle={`${dateFormat.format(new Date(event.eventDate))} — ${event.location}`}
        actions={
          <>
            <Link to={`/evenements/${event.id}/modifier`}>
              <Button>Modifier</Button>
            </Link>
            {statusActions[event.status].map((action) => (
              <Button key={action.to} variant={action.variant} onClick={() => changeStatus(action.to)}>
                {action.label}
              </Button>
            ))}
          </>
        }
      />

      <div className="space-y-6">
        {error ? <Alert>{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-3 flex items-center gap-3">
              <EventStatusBadge status={event.status} />
              <span className="text-xs text-slate-500">Créé par {event.createdBy.fullName}</span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{event.description}</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-slate-500">Places occupées</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {event.registrationsCount} / {event.maxParticipants}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {event.remainingSeats > 0 ? `${event.remainingSeats} place(s) restante(s)` : "Événement complet"}
            </p>
          </Card>
        </div>

        <RegisterParticipantPanel event={event} onRegistered={load} onError={setError} onNotice={setNotice} />

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-medium text-slate-900">Inscriptions</h2>
            <p className="text-sm text-slate-500">
              {event.registrations.length} inscription(s) — les inscriptions annulées ne consomment pas de place.
            </p>
          </div>

          {event.registrations.length === 0 ? (
            <EmptyState title="Aucune inscription" description="Inscrivez un participant pour commencer." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Participant</th>
                  <th className="px-5 py-2.5 font-medium">Contact</th>
                  <th className="px-5 py-2.5 font-medium">Inscrit le</th>
                  <th className="px-5 py-2.5 font-medium">Statut</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {event.registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{registration.participant.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {registration.participant.email}
                      {registration.participant.phone ? (
                        <span className="block text-xs text-slate-500">{registration.participant.phone}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {dateFormat.format(new Date(registration.createdAt))}
                    </td>
                    <td className="px-5 py-3">
                      <RegistrationStatusBadge status={registration.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {registration.status === "pending" ? (
                          <Button size="sm" onClick={() => changeRegistrationStatus(registration.id, "confirmed")}>
                            Confirmer
                          </Button>
                        ) : null}
                        {registration.status === "cancelled" ? (
                          <Button size="sm" onClick={() => changeRegistrationStatus(registration.id, "pending")}>
                            Réactiver
                          </Button>
                        ) : null}
                        {registration.status !== "cancelled" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => changeRegistrationStatus(registration.id, "cancelled")}
                          >
                            Annuler
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

function RegisterParticipantPanel({
  event,
  onRegistered,
  onError,
  onNotice,
}: {
  event: EventDetail;
  onRegistered: () => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ParticipantSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [creating, setCreating] = useState(false);

  const canRegister = event.status === "published" && event.remainingSeats > 0;

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(`/participants?search=${encodeURIComponent(term.trim())}&limit=10`);
      setResults(data.data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search, runSearch]);

  const alreadyRegistered = new Set(
    event.registrations.map((registration) => registration.participantId),
  );

  async function register(participantId: string) {
    onError("");
    onNotice("");
    try {
      await api.post("/registrations", { eventId: event.id, participantId });
      onNotice("Inscription enregistrée.");
      setSearch("");
      setResults([]);
      await onRegistered();
    } catch (registerError) {
      onError(getErrorMessage(registerError, "Impossible d'inscrire ce participant."));
    }
  }

  async function createAndRegister(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    setCreating(true);
    onError("");
    onNotice("");
    try {
      const { data: created } = await api.post("/participants", {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
      });
      await api.post("/registrations", { eventId: event.id, participantId: created.data.id });
      onNotice("Participant créé et inscrit.");
      setForm({ fullName: "", email: "", phone: "" });
      setShowCreate(false);
      await onRegistered();
    } catch (createError) {
      onError(getErrorMessage(createError, "Impossible de créer le participant."));
    } finally {
      setCreating(false);
    }
  }

  if (event.status !== "published") {
    return (
      <Alert tone="info">
        Les inscriptions sont désactivées : l'événement n'est pas publié.
      </Alert>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-slate-900">Inscrire un participant</h2>
          <p className="text-sm text-slate-500">Recherchez une personne existante ou créez-la directement.</p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? "Annuler" : "Nouveau participant"}
        </Button>
      </div>

      {showCreate ? (
        <form onSubmit={createAndRegister} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <Field label="Nom complet">
            <Input
              required
              value={form.fullName}
              onChange={(inputEvent) => setForm({ ...form, fullName: inputEvent.target.value })}
              placeholder="Salma Benali"
            />
          </Field>
          <Field label="Email">
            <Input
              required
              type="email"
              value={form.email}
              onChange={(inputEvent) => setForm({ ...form, email: inputEvent.target.value })}
              placeholder="salma@example.ma"
            />
          </Field>
          <Field label="Téléphone (optionnel)">
            <Input
              value={form.phone}
              onChange={(inputEvent) => setForm({ ...form, phone: inputEvent.target.value })}
              placeholder="+212 6 12 34 56 78"
            />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? "Création…" : "Créer et inscrire"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <Input
            value={search}
            onChange={(inputEvent) => setSearch(inputEvent.target.value)}
            placeholder="Rechercher par nom ou par email…"
          />

          {searching ? <Spinner label="Recherche" /> : null}

          {!searching && results.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {results.map((participant) => {
                const isRegistered = alreadyRegistered.has(participant.id);
                return (
                  <li key={participant.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{participant.fullName}</p>
                      <p className="text-xs text-slate-500">{participant.email}</p>
                    </div>
                    {isRegistered ? (
                      <span className="text-xs text-slate-400">Déjà inscrit</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!canRegister}
                        onClick={() => register(participant.id)}
                      >
                        Inscrire
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {!searching && search.trim().length > 0 && results.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Aucun participant trouvé. Utilisez « Nouveau participant » pour le créer.
            </p>
          ) : null}
        </>
      )}

      {event.remainingSeats === 0 ? (
        <p className="mt-3 text-sm text-amber-700">
          Cet événement a atteint sa capacité : aucune nouvelle inscription n'est acceptée.
        </p>
      ) : null}
    </Card>
  );
}