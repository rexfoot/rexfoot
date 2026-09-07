"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { YOUTUBE_CHANNEL_ID } from "@rexfoot/config";
import { useLiveAudioStatus } from "@/hooks/useLiveAudioStatus";
import { cn } from "@/lib/cn";

// "live_stream" est l'id vidéo spécial de YouTube qui pointe toujours vers le
// direct en cours d'une chaîne (peu importe son id de vidéo réel) -- pas besoin
// de connaître à l'avance quelle vidéo sera diffusée. mute=1 car les navigateurs
// bloquent l'autoplay avec son sans interaction préalable ; l'utilisateur active
// le son via les contrôles natifs du lecteur.
const EMBED_URL = `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}&autoplay=1&mute=1`;

/**
 * Commentaire audio en direct (toggle manuel, voir /admin/live-audio) --
 * ajout ciblé et réversible demandé par Hicham le 2026-09-07 : n'existe que
 * lorsque isLive est actif, ne modifie jamais le layout existant sinon. Un
 * seul iframe monté en permanence tant que isLive reste vrai (jamais
 * démonté/recréé au fil du scroll) : seule sa position bascule en CSS entre
 * l'emplacement sous le score et un mini-lecteur flottant en bas d'écran,
 * pour ne jamais couper la lecture en cours.
 */
export function LiveAudioPlayer() {
  const t = useTranslations("matches");
  const isLive = useLiveAudioStatus();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    if (!isLive) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsFloating(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLive]);

  if (!isLive) return null;

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <div
        className={cn(
          "z-40 overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card shadow-2xl transition-[position,width]",
          isFloating ? "fixed bottom-4 right-4 w-60 sm:w-72" : "relative w-full",
        )}
      >
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rf-live opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rf-live" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-rf-live">🔴 {t("live")}</span>
        </div>
        <div className="aspect-video w-full">
          <iframe
            src={EMBED_URL}
            title="RexFoot — commentaire audio en direct"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </>
  );
}
