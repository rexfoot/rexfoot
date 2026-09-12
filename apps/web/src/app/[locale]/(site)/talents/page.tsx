import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Video, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("talents.landing"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/talents", locale) };
}

export default async function TalentsLandingPage() {
  const t = await getTranslations("talents.landing");

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 text-center">
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-rf-fg">{t("title")}</h1>
        <p className="text-lg font-semibold text-rf-orange">{t("subtitle")}</p>
      </div>

      <p className="text-base leading-relaxed text-rf-fg-muted">{t("pitch")}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/talents/soumettre"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rf-orange px-6 py-3.5 text-base font-bold text-rf-bg transition-opacity hover:opacity-90"
        >
          <Video size={18} />
          {t("ctaSubmit")}
        </Link>
        <Link
          href="/talents/decouvrir"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rf-border px-6 py-3.5 text-base font-bold text-rf-fg transition-colors hover:border-rf-orange/50"
        >
          <Search size={18} />
          {t("ctaDiscover")}
        </Link>
      </div>

      <p className="text-sm font-semibold text-rf-success">{t("freeNote")}</p>
      <p className="text-xs text-rf-fg-subtle">{t("disclaimer")}</p>
    </div>
  );
}
