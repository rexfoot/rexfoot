import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { TalentSubmitForm } from "@/components/talents/TalentSubmitForm";
import { buildAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("talents.form"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/talents/soumettre", locale) };
}

export default function TalentSubmitPage() {
  return <TalentSubmitForm />;
}
