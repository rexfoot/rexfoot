"use client";

import { useRef, useState } from "react";
import { AdminInput, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!formRef.current) return;
    setError(null);
    setSuccess(false);
    setSaving(true);

    const formData = new FormData(formRef.current);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne sont pas identiques.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/admin/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: formData.get("currentPassword"), newPassword }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Une erreur est survenue, réessaie.");
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    formRef.current.reset();
  }

  return (
    <form ref={formRef} className="space-y-4">
      <FieldGroup label="Mot de passe actuel" htmlFor="currentPassword">
        <AdminInput id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </FieldGroup>
      <FieldGroup label="Nouveau mot de passe" htmlFor="newPassword" hint="8 caractères minimum.">
        <AdminInput id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
      </FieldGroup>
      <FieldGroup label="Confirmer le nouveau mot de passe" htmlFor="confirmPassword">
        <AdminInput id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
      </FieldGroup>

      {success && <Banner kind="success">Mot de passe mis à jour avec succès.</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      <AdminButton type="button" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Enregistrement…" : "Mettre à jour le mot de passe"}
      </AdminButton>
    </form>
  );
}
