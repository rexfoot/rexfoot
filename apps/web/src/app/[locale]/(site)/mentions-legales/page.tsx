import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo/alternates";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("legal"), getLocale()]);
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildAlternates("/mentions-legales", locale),
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

export default async function LegalNoticePage() {
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>

      <Section title={t("publisherTitle")} body={t("publisherBody")} />
      <Section title={t("directorTitle")} body={t("directorBody")} />
      <Section title={t("hostingTitle")} body={t("hostingBody")} />
      <Section title={t("ipTitle")} body={t("ipBody")} />
      <Section title={t("dataTitle")} body={t("dataBody")} />
      <Section title={t("contactTitle")} body={t("contactBody")} />
    </div>
  );
}
