import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates, localizedUrl } from "@/lib/seo/alternates";
import { Link } from "@/i18n/navigation";
import { getAuthorByName } from "@/lib/authors";

const CONTACT_EMAIL = "footrexofficial@gmail.com";

const TEAM = [
  { name: "Hicham Jikh Cheddad", initials: "HJ", roleKey: "directorRole", bioKey: "directorBio", jobTitle: "Directeur de la publication" },
  { name: "Redouane Jikh", initials: "RJ", roleKey: "chiefRole", bioKey: "chiefBio", jobTitle: "Rédacteur en chef" },
] as const;

/** "Libellé|suite" par ligne → [libellé en gras, suite]. */
function splitItems(raw: string): [string, string][] {
  return raw.split("\n").map((line) => {
    const [label, ...rest] = line.split("|");
    return [label, rest.join("|")];
  });
}

/** Pas d'espace avant une virgule, une espace sinon. */
function joiner(rest: string): string {
  return rest.startsWith(",") ? "" : " ";
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("editorial"), getLocale()]);
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildAlternates("/redaction", locale),
  };
}

export default async function EditorialTeamPage() {
  const [t, locale] = await Promise.all([getTranslations("editorial"), getLocale()]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";
  const personLd = (name: string, jobTitle: string) => {
    const profile = getAuthorByName(name);
    return profile
      ? { "@type": "Person", "@id": `${siteUrl}/auteur/${profile.slug}#person`, name, jobTitle, url: localizedUrl(locale, `/auteur/${profile.slug}`) }
      : { "@type": "Person", name, jobTitle };
  };

  // Données structurées : aide Google à identifier les responsables éditoriaux (E-E-A-T).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: "RexFoot",
    url: siteUrl,
    email: CONTACT_EMAIL,
    publishingPrinciples: localizedUrl(locale, "/redaction"),
    founder: personLd(TEAM[0].name, TEAM[0].jobTitle),
    employee: TEAM.map((m) => personLd(m.name, m.jobTitle)),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-bold text-rf-fg">{t("title")}</h1>
        <p className="text-[15px] leading-relaxed text-rf-fg-subtle">{t("intro")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-rf-fg">{t("aboutTitle")}</h2>
        {t("aboutBody")
          .split("\n")
          .map((line, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-rf-fg-subtle">
              {line}
            </p>
          ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-rf-fg">{t("offerTitle")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {splitItems(t("offerItems")).map(([label, rest], i) => (
            <li
              key={i}
              className="rounded-[var(--rf-radius,12px)] border border-rf-border bg-rf-bg-card px-4 py-3 text-sm text-rf-fg-subtle"
            >
              <strong className="font-semibold text-rf-fg">{label}</strong>
              {joiner(rest)}
              {rest}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-rf-fg">{t("methodTitle")}</h2>
        <p className="text-[15px] text-rf-fg-subtle">{t("methodIntro")}</p>
        <ol className="space-y-2">
          {splitItems(t("methodItems")).map(([label, rest], i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-rf-fg-subtle">
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rf-gold text-xs font-bold text-rf-bg"
              >
                {i + 1}
              </span>
              <span>
                <strong className="font-semibold text-rf-fg">{label}</strong>
                {joiner(rest)}
                {rest}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-rf-fg">{t("teamTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEAM.map((m) => (
            <article
              key={m.name}
              className="flex flex-col gap-3 rounded-[var(--rf-radius,12px)] border border-rf-border bg-rf-bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rf-gold font-display text-base font-bold text-rf-bg"
                >
                  {m.initials}
                </span>
                <div>
                  {getAuthorByName(m.name) ? (
                    <Link
                      href={`/auteur/${getAuthorByName(m.name)!.slug}`}
                      className="font-display text-base font-bold text-rf-fg hover:text-rf-gold"
                    >
                      {m.name}
                    </Link>
                  ) : (
                    <p className="font-display text-base font-bold text-rf-fg">{m.name}</p>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-rf-gold">{t(m.roleKey)}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-rf-fg-subtle">{t(m.bioKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-rf-fg">{t("chartTitle")}</h2>
        <ul className="list-disc space-y-1 ps-5">
          {t("chartBody")
            .split("\n")
            .map((line, i) => (
              <li key={i} className="text-[15px] leading-relaxed text-rf-fg-subtle">
                {line}
              </li>
            ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-[var(--rf-radius,12px)] border border-rf-border bg-rf-bg-elevated p-5">
        <h2 className="font-display text-lg font-bold text-rf-fg">{t("contactTitle")}</h2>
        <p className="text-[15px] text-rf-fg-subtle">
          {t("contactBody")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-rf-fg underline hover:text-rf-gold">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}
