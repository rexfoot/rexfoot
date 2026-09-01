"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminInput, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        displayName: formData.get("displayName"),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Impossible de créer le compte.");
      setLoading(false);
      return;
    }

    router.push("/account");
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
          <p className="mt-1 text-sm text-rf-fg-muted">Créer un compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup label="Nom" htmlFor="displayName">
            <AdminInput id="displayName" name="displayName" autoComplete="name" required autoFocus />
          </FieldGroup>
          <FieldGroup label="Email" htmlFor="email">
            <AdminInput id="email" name="email" type="email" autoComplete="username" required />
          </FieldGroup>
          <FieldGroup label="Mot de passe" htmlFor="password" hint="8 caractères minimum.">
            <AdminInput id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </FieldGroup>

          {error && <Banner kind="error">{error}</Banner>}

          <AdminButton type="submit" disabled={loading} className="w-full">
            {loading ? "Création…" : "Créer mon compte"}
          </AdminButton>
        </form>

        <p className="mt-5 text-center text-sm text-rf-fg-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-rf-gold hover:underline">
            Connecte-toi
          </Link>
        </p>
      </div>
    </div>
  );
}
