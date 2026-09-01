"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/auth/permissions";
import { AdminButton, AdminInput, AdminSelect, Banner, FieldGroup } from "@/components/admin/ui";

export function InviteAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("JOURNALIST");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Échec de l'opération.");
      setSaving(false);
      return;
    }

    setSuccess(`${email} a maintenant le rôle ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}.`);
    setEmail("");
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-rf-border bg-rf-bg-card p-5">
      <div>
        <h2 className="font-display text-lg font-bold text-rf-fg">Donner un accès admin</h2>
        <p className="mt-1 text-sm text-rf-fg-muted">
          La personne doit d&apos;abord avoir créé un compte sur le site (via /signup). Indique son email pour lui
          attribuer un rôle.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <FieldGroup label="Email du compte" htmlFor="invite-email">
          <AdminInput
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="personne@example.com"
          />
        </FieldGroup>

        <FieldGroup label="Rôle" htmlFor="invite-role">
          <AdminSelect id="invite-role" value={role} onChange={(event) => setRole(event.target.value)}>
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </AdminSelect>
        </FieldGroup>
      </div>

      {error && <Banner kind="error">{error}</Banner>}
      {success && <Banner kind="success">{success}</Banner>}

      <AdminButton type="submit" disabled={saving}>
        {saving ? "Attribution…" : "Attribuer le rôle"}
      </AdminButton>
    </form>
  );
}
