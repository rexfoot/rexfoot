"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface PublicProfileToggleProps {
  userId: string;
  initialValue: boolean;
}

/** Case à cocher opt-in — le profil public (/u/[id]) reste 404 tant que ce n'est pas activé. */
export function PublicProfileToggle({ userId, initialValue }: PublicProfileToggleProps) {
  const t = useTranslations("account");
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleChange(checked: boolean) {
    setEnabled(checked);
    setSaving(true);
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicProfile: checked }),
    });
    if (!response.ok) setEnabled(!checked);
    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-rf-border bg-rf-bg-card p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={(event) => handleChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-rf-gold"
        />
        <span>
          <span className="block text-sm font-medium text-rf-fg">{t("publicProfileToggle")}</span>
          <span className="mt-0.5 block text-xs text-rf-fg-subtle">{t("publicProfileHint")}</span>
        </span>
      </label>

      {enabled && (
        <Link
          href={`/u/${userId}`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-rf-gold hover:underline"
        >
          {t("viewPublicProfile")}
          <ExternalLink size={14} />
        </Link>
      )}
    </div>
  );
}
