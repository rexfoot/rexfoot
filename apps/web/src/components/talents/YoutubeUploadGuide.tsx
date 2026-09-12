"use client";

import { useTranslations } from "next-intl";
import { Youtube, Upload, Eye, Share2 } from "lucide-react";

const STEP_ICONS = [Upload, Eye, Share2] as const;

/**
 * Guide pour les joueurs qui n'ont jamais mis de vidéo en ligne sur YouTube —
 * ajouté après le retrait complet de l'option WhatsApp pour la vidéo (2026-09-12,
 * demande explicite de Hicham : trop de messages WhatsApp à traiter à la main).
 * Le lien YouTube est maintenant la SEULE façon de soumettre la vidéo, donc ce
 * guide doit couvrir même le joueur qui n'a jamais utilisé cette fonctionnalité.
 */
export function YoutubeUploadGuide() {
  const t = useTranslations("talents.youtubeGuide");
  const steps = [t("step2"), t("step3"), t("step4")];

  return (
    <div className="space-y-3 rounded-xl border border-rf-border bg-rf-bg-elevated p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-rf-fg">
        <Youtube size={18} className="text-rf-orange" />
        {t("step1")}
      </p>
      <ol className="space-y-1.5 text-sm text-rf-fg">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-rf-orange">{i + 2}.</span>
              {step}
              {Icon && <Icon size={14} className="mt-0.5 shrink-0 text-rf-orange" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
