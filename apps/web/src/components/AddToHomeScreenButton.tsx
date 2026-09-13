"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Smartphone, Share, SquarePlus, X } from "lucide-react";

/**
 * iOS/iPadOS n'expose aucune API pour déclencher "Ajouter à l'écran
 * d'accueil" par programme (contrairement à `beforeinstallprompt` sur
 * Android/Chrome) — on ne peut qu'expliquer la manip via le partage Safari.
 * Composant iOS-only : rendu null partout ailleurs (Android, desktop), donc
 * aucun impact sur le reste du site ni sur l'app Android/TWA.
 */
export function AddToHomeScreenButton() {
  const t = useTranslations("addToHomeScreen");
  const [isEligible, setIsEligible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // setTimeout plutôt qu'un appel synchrone : évite un rendu en cascade
    // directement dans le corps de l'effet (règle react-hooks/set-state-in-effect).
    const id = setTimeout(() => {
      const ua = window.navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const isStandalone =
        (window.navigator as { standalone?: boolean }).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;

      if (isIOS && !isStandalone) setIsEligible(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (!isEligible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 underline hover:text-rf-fg"
      >
        <Smartphone size={13} />
        {t("button")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-rf-border bg-rf-bg-card p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="font-display text-base font-bold text-rf-fg">{t("title")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="shrink-0 rounded p-1 text-rf-fg-subtle transition-colors hover:text-rf-fg"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="space-y-3 text-sm text-rf-fg-muted">
              <Step icon={Share}>{t("step1")}</Step>
              <Step icon={SquarePlus}>{t("step2")}</Step>
              <Step number={3}>{t("step3")}</Step>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}

function Step({
  icon: Icon,
  number,
  children,
}: {
  icon?: typeof Share;
  number?: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rf-bg-elevated text-rf-gold">
        {Icon ? <Icon size={14} /> : number}
      </span>
      <span>{children}</span>
    </li>
  );
}
