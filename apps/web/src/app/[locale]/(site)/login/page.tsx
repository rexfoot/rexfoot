"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { AdminInput, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Impossible de se connecter.");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-8">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-extrabold tracking-tight">
            <span className="text-rf-gold">Rex</span>
            <span className="text-rf-fg">Foot</span>
          </p>
          <p className="mt-1 text-sm text-rf-fg-muted">Connexion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup label="Email" htmlFor="email">
            <AdminInput id="email" name="email" type="email" autoComplete="username" required autoFocus />
          </FieldGroup>
          <FieldGroup label="Mot de passe" htmlFor="password">
            <AdminInput id="password" name="password" type="password" autoComplete="current-password" required />
          </FieldGroup>

          {error && <Banner kind="error">{error}</Banner>}

          <AdminButton type="submit" disabled={loading} className="w-full">
            {loading ? "Connexion…" : "Se connecter"}
          </AdminButton>
        </form>

        <p className="mt-5 text-center text-sm text-rf-fg-muted">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-rf-gold hover:underline">
            Inscris-toi
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
