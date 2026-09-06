import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("privacy"), getLocale()]);
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildAlternates("/confidentialite", locale),
  };
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold text-rf-fg">{title}</h2>
      {body.split("\n").map((line, i) => (
        <p key={i} className="text-[15px] leading-relaxed text-rf-fg-subtle">
          {line}
        </p>
      ))}
    </section>
  );
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("privacy");

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>

      <Section title={t("introTitle")} body={t("introBody")} />
      <Section title={t("dataTitle")} body={t("dataBody")} />
      <Section title={t("useTitle")} body={t("useBody")} />
      <Section title={t("sharingTitle")} body={t("sharingBody")} />
      <Section title={t("cookiesTitle")} body={t("cookiesBody")} />
      <Section title={t("rightsTitle")} body={t("rightsBody")} />
      <Section title={t("contactTitle")} body={t("contactBody")} />

      <p className="text-sm text-rf-fg-muted">{t("lastUpdated")}</p>
    </div>
  );
}
