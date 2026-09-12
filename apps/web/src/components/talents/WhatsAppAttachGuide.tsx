"use client";

import { useTranslations } from "next-intl";
import { Paperclip, Camera, Mic, Send } from "lucide-react";

/**
 * Illustration statique (aucune vraie capture d'écran WhatsApp disponible/à
 * imiter à l'identique — juste une reconstitution générique de la barre de
 * saisie) pour montrer OÙ taper une fois WhatsApp ouvert. Ajouté après un
 * retour réel (Hicham a buté deux fois sur "pas d'endroit pour la vidéo" —
 * voir TalentSubmitForm.tsx, confirmation.attachHint) : le texte seul ne
 * suffisait pas, il fallait montrer visuellement le trombone à cliquer.
 */
export function WhatsAppAttachGuide() {
  const t = useTranslations("talents.confirmation");

  return (
    <div className="space-y-3 rounded-xl border border-rf-border bg-rf-bg-elevated p-4">
      {/* Reconstitution de la barre de saisie WhatsApp — le trombone est mis en
          évidence (anneau + pastille "1") puisque c'est la seule action requise. */}
      <div className="flex items-center gap-2 rounded-full border border-rf-border bg-rf-bg-card px-3 py-2">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-rf-orange">
          <Paperclip size={16} className="text-rf-orange" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rf-orange text-[10px] font-bold text-rf-bg">
            1
          </span>
        </span>
        <span className="flex-1 truncate text-xs text-rf-fg-subtle">Bonjour RexFoot, je souhaite présenter…</span>
        <Camera size={16} className="shrink-0 text-rf-fg-subtle" />
        <Mic size={16} className="shrink-0 text-rf-fg-subtle" />
      </div>

      <ol className="space-y-1.5 text-sm text-rf-fg">
        <li className="flex gap-2">
          <span className="font-bold text-rf-orange">1.</span>
          {t("attachStep1")} <Paperclip size={14} className="inline text-rf-orange" />
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-rf-orange">2.</span>
          {t("attachStep2")}
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-rf-orange">3.</span>
          {t("attachStep3")} <Send size={14} className="inline text-rf-orange" />
        </li>
      </ol>
    </div>
  );
}
