"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Facebook, Twitter, MessageCircle, Link2, Check } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { localizedUrl } from "@/lib/seo/alternates";
import { cn } from "@/lib/cn";

interface ShareButtonsProps {
  title: string;
  className?: string;
}

/**
 * Boutons de partage — l'URL est reconstruite via la même logique que le SEO
 * (lib/seo/alternates), jamais `window.location`, pour que le rendu serveur
 * et client produisent exactement le même href (pas de hydration mismatch).
 */
export function ShareButtons({ title, className }: ShareButtonsProps) {
  const t = useTranslations("share");
  const locale = useLocale();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const url = localizedUrl(locale, pathname);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // presse-papiers indisponible (contexte non sécurisé, permission refusée) — rien à faire
    }
  }

  const targets = [
    {
      key: "whatsapp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
      key: "twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      key: "facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs font-semibold tracking-wide text-rf-fg-subtle uppercase">{t("label")}</span>
      {targets.map(({ key, icon: Icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={t(key)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-rf-bg-card text-rf-fg-muted transition-colors hover:text-rf-fg"
        >
          <Icon size={16} />
          <span className="sr-only">{t(key)}</span>
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        title={t("copyLink")}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-rf-bg-card text-rf-fg-muted transition-colors hover:text-rf-fg"
      >
        {copied ? <Check size={16} className="text-rf-success" /> : <Link2 size={16} />}
        <span className="sr-only">{t("copyLink")}</span>
      </button>
    </div>
  );
}
