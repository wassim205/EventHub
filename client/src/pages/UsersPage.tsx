import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, getErrorMessage } from "../api/client";
import type { Paginated, PaginationMeta, User, UserRole } from "../api/types";
import { Pagination } from "../components/Pagination";
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from "../components/ui";

const emptyMeta: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 1 };

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ fullName: "", email: "", password: "", role: "staff" as UserRole });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<Paginated<User>>(`/users?page=${page}&limit=10`);
      setUsers(data.data);
      setMeta(data.meta);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Impossible de charger les utilisateurs."));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await api.post("/users", draft);
      setNotice("Compte créé.");
      setShowForm(false);
      setDraft({ fullName: "", email: "", password: "", role: "staff" });
      await load();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Création impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRole(user: User, role: UserRole) {
    setError("");
    setNotice("");
    try {
      await api.put(`/users/${user.id}`, { role });
      setNotice(`Rôle de ${user.fullName} mis à jour.`);
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Mise à jour impossible."));
    }
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle="Comptes de l'équipe d'organisation, distincts des participants."
        actions={
          <Button variant="primary" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Annuler" : "Nouveau compte"}
          </Button>
        }
      />

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
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Mot de passe" hint="8 caractères minimum.">
              <Input
                required
                type="password"
                minLength={8}
                value={draft.password}
                onChange={(inputEvent) => setDraft({ ...draft, password: inputEvent.target.value })}
              />
            </Field>
            <Field label="Rôle">
              <Select
                value={draft.role}
                onChange={(inputEvent) => setDraft({ ...draft, role: inputEvent.target.value as UserRole })}
              >
                <option value="staff">Staff</option>
                <option value="admin">Administrateur</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Création…" : "Créer le compte"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Chargement des utilisateurs" />
        ) : users.length === 0 ? (
          <EmptyState title="Aucun utilisateur" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Nom</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-3 font-medium text-slate-900">{user.fullName}</td>
                  <td className="px-5 py-3 text-slate-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <Select
                      aria-label={`Rôle de ${user.fullName}`}
                      value={user.role}
                      className="w-40"
                      onChange={(selectEvent) => changeRole(user, selectEvent.target.value as UserRole)}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Administrateur</option>
                    </Select>
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