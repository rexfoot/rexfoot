"use client";

import { useEffect, useState } from "react";

const VISIBLE_DURATION_MS = 2800;

/**
 * Ballon qui rentre dans le filet + "¡GOOOOL!" en plein écran — se déclenche
 * quand `trigger` change (voir useGoalCelebration dans MatchDetailClient.tsx),
 * jamais au montage initial. `trigger` plutôt qu'un simple booléen : un
 * deuxième but avant la fin de l'animation précédente doit quand même la
 * relancer, ce qu'un booléen qui reste `true` ne détecterait pas.
 */
export function GoalCelebration({ trigger, label }: { trigger: number; label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), VISIBLE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div
      key={trigger}
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm animate-[rf-goal-backdrop_2.8s_ease-out_forwards]"
    >
      <div className="relative h-32 w-44 sm:h-40 sm:w-56">
        {/* Filet */}
        <div
          className="absolute inset-x-0 bottom-0 top-2 rounded-t-md border-4 border-white/90 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.18)_0,rgba(255,255,255,0.18)_1px,transparent_1px,transparent_10px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.18)_0,rgba(255,255,255,0.18)_1px,transparent_1px,transparent_10px)] animate-[rf-goal-net_2.8s_ease-out_forwards]"
        />
        {/* Ballon */}
        <span
          className="absolute left-1/2 top-1/2 text-4xl sm:text-5xl animate-[rf-goal-ball_2.8s_cubic-bezier(0.22,1,0.36,1)_forwards]"
          aria-hidden
        >
          ⚽
        </span>
      </div>

      <p className="mt-6 animate-[rf-goal-text_2.8s_ease-out_forwards] font-display text-6xl font-black tracking-tight text-rf-gold drop-shadow-[0_0_25px_rgba(0,230,118,0.65)] sm:text-7xl">
        ¡GOOOOL!
      </p>
      {label && <p className="mt-2 animate-[rf-goal-text_2.8s_ease-out_forwards] text-lg font-semibold text-white">{label}</p>}
    </div>
  );
}
