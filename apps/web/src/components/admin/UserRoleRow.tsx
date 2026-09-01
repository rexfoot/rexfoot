"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@rexfoot/db";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/auth/permissions";
import { AdminSelect } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

interface UserRoleRowProps {
  user: { id: string; email: string; displayName: string; role: UserRole };
  isSelf: boolean;
}

export function UserRoleRow({ user, isSelf }: UserRoleRowProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(role: string) {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Échec de la mise à jour.");
      setSaving(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-rf-fg">
          {user.displayName} {isSelf && <span className="text-xs text-rf-fg-subtle">(toi)</span>}
        </p>
        <p className="truncate text-sm text-rf-fg-muted">{user.email}</p>
        {error && <p className="mt-1 text-xs text-rf-live">{error}</p>}
      </div>

      {isSelf ? (
        <span className="shrink-0 rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-rf-fg-muted">
          {ROLE_LABELS[user.role]}
        </span>
      ) : (
        <AdminSelect
          defaultValue={user.role}
          disabled={saving}
          onChange={(event) => handleChange(event.target.value)}
          className={cn("w-full sm:w-56", saving && "opacity-60")}
        >
          <option value="USER">Retirer l&apos;accès admin</option>
          {ADMIN_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </AdminSelect>
      )}
    </div>
  );
}
