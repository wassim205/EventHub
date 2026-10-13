import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../api/client";
import { Alert, Button, Field, Input } from "../components/ui";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (loginError) {
      setError(getErrorMessage(loginError, "Connexion impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">EventHub</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion d'événements et d'inscriptions</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {error ? <Alert>{error}</Alert> : null}

            <Field label="Adresse email">
              <Input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@eventhub.ma"
              />
            </Field>

            <Field label="Mot de passe">
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? "Connexion…" : "Se connecter"}
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Comptes de démonstration</p>
          <p className="mt-1">admin@eventhub.ma / Admin@2026</p>
          <p>staff@eventhub.ma / Staff@2026</p>
        </div>
      </div>
    </div>
  );
}