"use client";

import { MessageCircle, Mail } from "lucide-react";

// Pas de compte requis pour contacter (section 13 du plan) : sans consentement
// du joueur (contactConsentGiven), le recruteur passe par cette adresse plutôt
// que par le numéro WhatsApp personnel, jamais affiché dans ce cas — voir
// TalentProfile.contactConsentGiven dans le schéma.
const REXFOOT_CONTACT_EMAIL = "contact@rexfoot.com";

interface TalentContactButtonProps {
  slug: string;
  whatsappNumber: string | null;
  whatsappLabel: string;
  emailLabel: string;
  subject: string;
}

export function TalentContactButton({ slug, whatsappNumber, whatsappLabel, emailLabel, subject }: TalentContactButtonProps) {
  function trackClick() {
    fetch(`/api/talents/${slug}/contact-click`, { method: "POST" }).catch(() => {});
  }

  if (whatsappNumber) {
    const href = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackClick}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rf-success px-6 py-3.5 text-base font-bold text-rf-bg transition-opacity hover:opacity-90 sm:w-auto"
      >
        <MessageCircle size={18} />
        {whatsappLabel}
      </a>
    );
  }

  const href = `mailto:${REXFOOT_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  return (
    <a
      href={href}
      onClick={trackClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rf-border px-6 py-3.5 text-base font-bold text-rf-fg transition-colors hover:border-rf-orange/50 sm:w-auto"
    >
      <Mail size={18} />
      {emailLabel}
    </a>
  );
}
