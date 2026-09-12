"use client";

import { useEffect } from "react";

interface TrackViewProps {
  entityType: "ARTICLE" | "VIDEO" | "TEAM" | "PLAYER" | "TALENT_PROFILE";
  entityId: string;
}

/** Composant invisible : enregistre une vue réelle pour le calcul des tendances (section 19 du plan). */
export function TrackView({ entityType, entityId }: TrackViewProps) {
  useEffect(() => {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId }),
    }).catch(() => {});
  }, [entityType, entityId]);

  return null;
}
