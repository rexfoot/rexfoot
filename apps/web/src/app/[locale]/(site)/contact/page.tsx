import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Mail, Facebook, Youtube } from "lucide-react";
import { buildAlternates } from "@/lib/seo/alternates";
import { CONTACT_EMAIL, FACEBOOK_PAGE_URL, YOUTUBE_CHANNEL_URL } from "@/lib/social-links";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("contact"), getLocale()]);
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildAlternates("/contact", locale),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");

  const channels = [
    { href: `mailto:${CONTACT_EMAIL}`, icon: Mail, label: t("emailLabel"), value: CONTACT_EMAIL },
    { href: FACEBOOK_PAGE_URL, icon: Facebook, label: "Facebook", value: "RexFoot" },
    { href: YOUTUBE_CHANNEL_URL, icon: Youtube, label: "YouTube", value: "RexFoot" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>
        <p className="text-[15px] leading-relaxed text-rf-fg-subtle">{t("intro")}</p>
      </div>

      <ul className="space-y-3">
        {channels.map(({ href, icon: Icon, label, value }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-rf-border bg-rf-bg-card p-4 transition-colors hover:border-rf-gold/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rf-gold/15 text-rf-gold">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold tracking-wide text-rf-fg-muted uppercase">{label}</span>
                <span className="block truncate font-medium text-rf-fg">{value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="text-sm text-rf-fg-muted">{t("responseTime")}</p>
    </div>
  );
}
