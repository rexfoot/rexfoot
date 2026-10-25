"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";

type SceneProps = { onReady: () => void; onFailure: () => void; onKick: () => void };
type SceneComponent = ComponentType<SceneProps>;

export function CinematicIntro({ onDismiss }: { onDismiss: () => void }) {
  const [Scene, setScene] = useState<SceneComponent | null>(null);
  const [started, setStarted] = useState(false);
  const [fading, setFading] = useState(false);
  const [ready, setReady] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    void import("./CinematicIntroScene").then(
      (module) => {
        if (mounted) setScene(() => module.CinematicIntroScene);
      },
      () => onDismiss(),
    );
    return () => {
      mounted = false;
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [onDismiss]);

  const dismissSoon = (delay: number) => {
    setFading(true);
    fadeTimer.current = setTimeout(onDismiss, delay);
  };

  if (!Scene) return null;

  return (
    <div
      className={`rf-cinematic ${ready ? "is-ready" : "is-loading"} ${started ? "is-kicked" : ""} ${fading ? "is-fading" : ""}`}
      aria-label="Introduction RexFoot"
      aria-live="polite"
      onAnimationEnd={(event) => {
        if (started && event.target === event.currentTarget) onDismiss();
      }}
    >
      <Scene
        onReady={() => setReady(true)}
        onFailure={onDismiss}
        onKick={() => setStarted(true)}
      />
      {ready && (
        <>
          <button
            className="rf-cinematic-skip"
            type="button"
            onClick={() => dismissSoon(250)}
            aria-label="Passer l’introduction"
          >
            Passer
          </button>
          <div className={`rf-cinematic-hint ${started ? "is-hidden" : ""}`}>Touchez le ballon</div>
        </>
      )}
    </div>
  );
}
