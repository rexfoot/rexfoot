"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Heart } from "lucide-react";
import type { FavoriteEntityType } from "@rexfoot/db";
import { cn } from "@/lib/cn";

interface FavoriteButtonProps {
  entityType: FavoriteEntityType;
  entityId: string;
}

/**
 * Cœur cliquable sur les fiches club/joueur/compétition. Résout son état
 * (connecté ? déjà favori ?) via un fetch client au montage plutôt que par
 * les props du Server Component parent — ces pages restent en ISR
 * (`revalidate`), donc pas de `cookies()` côté serveur là-bas.
 */
export function FavoriteButton({ entityType, entityId }: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/favorites/status?entityType=${entityType}&entityId=${entityId}`)
      .then((res) => res.json())
      .then((body: { isLoggedIn: boolean; favorited: boolean }) => {
        if (cancelled) return;
        setIsLoggedIn(body.isLoggedIn);
        setFavorited(body.favorited);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  async function toggle() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setPending(true);
    const method = favorited ? "DELETE" : "POST";
    const response = await fetch("/api/favorites", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId }),
    });
    if (response.ok) setFavorited(!favorited);
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || !ready}
      aria-pressed={favorited}
      title={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
        favorited
          ? "border-rf-crimson bg-rf-crimson/15 text-rf-crimson"
          : "border-rf-border text-rf-fg-muted hover:border-rf-crimson/40 hover:text-rf-crimson",
      )}
    >
      <Heart size={19} fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
