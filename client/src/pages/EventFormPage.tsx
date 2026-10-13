import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import type { EventDetail } from "../api/types";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner, Textarea } from "../components/ui";

type FormState = {
  title: string;
  description: string;
  location: string;
  eventDate: string;
  maxParticipants: string;
  status: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  location: "",
  eventDate: "",
  maxParticipants: "30",
  status: "draft",
};

/** Format attendu par <input type="datetime-local"> à partir d'une date ISO. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get<{ data: EventDetail }>(`/events/${id}`)
      .then(({ data }) => {
        setForm({
          title: data.data.title,
          description: data.data.description,
          location: data.data.location,
          eventDate: toLocalInput(data.data.eventDate),
          maxParticipants: String(data.data.maxParticipants),
          status: data.data.status,
        });
      })
      .catch((fetchError) => setError(getErrorMessage(fetchError, "Impossible de charger l'événement.")))
      .finally(() => setLoading(false));
  }, [id]);

  function update(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      eventDate: new Date(form.eventDate).toISOString(),
      maxParticipants: Number(form.maxParticipants),
    };

    try {
      const { data } = isEdit
        ? await api.put(`/events/${id}`, payload)
        : await api.post("/events", { ...payload, status: form.status });

      navigate(`/evenements/${data.data.id}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Enregistrement impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Spinner label="Chargement" />;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? "Modifier l'événement" : "Nouvel événement"}
        subtitle={
          isEdit
            ? "Le statut se modifie depuis la page de détail de l'événement."
            : "Un événement est créé en brouillon, vous pourrez ensuite le publier."
        }
        actions={
          <Link to={isEdit ? `/evenements/${id}` : "/evenements"}>
            <Button>Annuler</Button>
          </Link>
        }
      />

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}

          <Field label="Titre">
            <Input required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Conférence DevOps Casablanca" />
          </Field>

          <Field label="Description">
            <Textarea
              required
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Décrivez le programme, le format et le public visé."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lieu">
              <Input required value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Palais des Congrès, Casablanca" />
            </Field>

            <Field label="Date et heure">
              <Input
                required
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) => update("eventDate", e.target.value)}
              />
            </Field>

            <Field label="Places maximum">
              <Input
                required
                type="number"
                min={1}
                max={10000}
                value={form.maxParticipants}
                onChange={(e) => update("maxParticipants", e.target.value)}
              />
            </Field>

            {!isEdit ? (
              <Field label="Statut initial" hint="Publié immédiatement, l'événement devient inscriptible.">
                <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                </Select>
              </Field>
            ) : null}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer l'événement"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}