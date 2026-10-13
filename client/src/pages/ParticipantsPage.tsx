import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, getErrorMessage } from "../api/client";
import type { Paginated, PaginationMeta, ParticipantSummary } from "../api/types";
import { Pagination } from "../components/Pagination";
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, Spinner } from "../components/ui";

const emptyMeta: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 1 };

type Draft = { fullName: string; email: string; phone: string };

const emptyDraft: Draft = { fullName: "", email: "", phone: "" };

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());

      const { data } = await api.get<Paginated<ParticipantSummary>>(`/participants?${params}`);
      setParticipants(data.data);
      setMeta(data.meta);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Impossible de charger les participants."));
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(true);
    setError("");
  }

  function openEdit(participant: ParticipantSummary) {
    setEditingId(participant.id);
    setDraft({ fullName: participant.fullName, email: participant.email, phone: participant.phone ?? "" });
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    const payload = {
      fullName: draft.fullName,
      email: draft.email,
      phone: draft.phone || undefined,
    };

    try {
      if (editingId) {
        await api.put(`/participants/${editingId}`, payload);
        setNotice("Participant mis à jour.");
      } else {
        await api.post("/participants", payload);
        setNotice("Participant créé.");
      }
      setShowForm(false);
      setDraft(emptyDraft);
      setEditingId(null);
      await load();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Enregistrement impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(participant: ParticipantSummary) {
    setError("");
    setNotice("");
    try {
      await api.delete(`/participants/${participant.id}`);
      setNotice("Participant supprimé.");
      await load();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Suppression impossible."));
    }
  }

  return (
    <div>
      <PageHeader
        title="Participants"
        subtitle="Recherchez par nom ou par adresse email."
        actions={
          <Button variant="primary" onClick={openCreate}>
            Nouveau participant
          </Button>
        }
      />

      <Card className="mb-6 p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nom ou email…"
            value={search}
            onChange={(inputEvent) => setSearch(inputEvent.target.value)}
            onKeyDown={(inputEvent) => {
              if (inputEvent.key === "Enter") {
                setAppliedSearch(search);
                setPage(1);
              }
            }}
          />
          <Button
            variant="primary"
            onClick={() => {
              setAppliedSearch(search);
              setPage(1);
            }}
          >
            Rechercher
          </Button>
          <Button
            onClick={() => {
              setSearch("");
              setAppliedSearch("");
              setPage(1);
            }}
          >
            Réinitialiser
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      {showForm ? (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 font-medium text-slate-900">
            {editingId ? "Modifier le participant" : "Nouveau participant"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <Field label="Nom complet">
              <Input
                required
                value={draft.fullName}
                onChange={(inputEvent) => setDraft({ ...draft, fullName: inputEvent.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                required
                type="email"
                value={draft.email}
                onChange={(inputEvent) => setDraft({ ...draft, email: inputEvent.target.value })}
              />
            </Field>
            <Field label="Téléphone (optionnel)">
              <Input
                value={draft.phone}
                onChange={(inputEvent) => setDraft({ ...draft, phone: inputEvent.target.value })}
              />
            </Field>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Chargement des participants" />
        ) : participants.length === 0 ? (
          <EmptyState title="Aucun participant" description="Aucun participant ne correspond à cette recherche." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Nom</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Téléphone</th>
                <th className="px-5 py-2.5 font-medium">Inscriptions</th>
                <th className="px-5 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participants.map((participant) => (
                <tr key={participant.id}>
                  <td className="px-5 py-3 font-medium text-slate-900">{participant.fullName}</td>
                  <td className="px-5 py-3 text-slate-600">{participant.email}</td>
                  <td className="px-5 py-3 text-slate-600">{participant.phone ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{participant.registrationsCount}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => openEdit(participant)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(participant)}>
                        Supprimer
                      </Button>
                    </div>
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