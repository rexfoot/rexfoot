import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("talents.recruiters"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/talents/recruteurs", locale) };
}

export default async function TalentsRecruitersPage() {
  const t = await getTranslations("talents.recruiters");

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10 text-center">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>
      <p className="text-base text-rf-fg-muted">{t("body")}</p>
      <Link
        href="/talents/decouvrir"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rf-orange px-6 py-3.5 text-base font-bold text-rf-bg transition-opacity hover:opacity-90"
      >
        <Search size={18} />
        {t("cta")}
      </Link>
      <p className="text-sm font-semibold text-rf-success">{t("freeNote")}</p>
    </div>
  );
}
