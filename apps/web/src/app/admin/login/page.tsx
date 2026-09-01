"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminInput, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth/login", {
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

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rf-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-rf-border bg-rf-bg-card p-8">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-extrabold tracking-tight">
            <span className="text-rf-gold">Rex</span>
            <span className="text-rf-fg">Foot</span>
          </p>
          <p className="mt-1 text-sm text-rf-fg-muted">Panel d&apos;administration</p>
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
      </div>
    </div>
  );
}
