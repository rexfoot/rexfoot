import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@rexfoot/db";
import { SITE_NAME } from "@rexfoot/config";
import { NewsCard } from "@/components/NewsCard";
import { getAuthorBySlug, pick } from "@/lib/authors";
import { buildAlternates, localizedUrl } from "@/lib/seo/alternates";

// Liste d'articles lue en base : rendu à la requête (pas au docker build).
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

const ARTICLES_TITLE: Record<string, string> = {
  fr: "Ses articles sur RexFoot",
  en: "His articles on RexFoot",
  es: "Sus artículos en RexFoot",
};
const NO_ARTICLES: Record<string, string> = {
  fr: "Aucun article publié pour le moment.",
  en: "No articles published yet.",
  es: "Aún no hay artículos publicados.",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return {};
  const locale = await getLocale();
  const jobTitle = pick(author.jobTitle, locale);
  // Titre absolu : le nom complet en tête, sans dépendre du template "%s | RexFoot".
  const title = `${author.displayName} – ${jobTitle}`;
  const description = pick(author.bio, locale).slice(0, 160);
  return {
    title: { absolute: title },
    description,
    alternates: buildAlternates(`/auteur/${slug}`, locale),
    openGraph: { type: "profile", title, description },
  };
}

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();
  const locale = await getLocale();

  const articles = await prisma.newsArticle.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null }, author: { displayName: author.displayName } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      coverImageUrl: true,
      publishedAt: true,
      category: true,
    },
    take: 60,
  });

  const pageUrl = localizedUrl(locale, `/auteur/${slug}`);
  const jobTitle = pick(author.jobTitle, locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: pageUrl,
    mainEntity: {
      "@type": "Person",
      "@id": `${siteUrl}/auteur/${slug}#person`,
      name: author.displayName,
      jobTitle,
      description: pick(author.bio, locale),
      url: pageUrl,
      worksFor: { "@type": "NewsMediaOrganization", name: SITE_NAME, url: siteUrl },
      ...(author.sameAs.length ? { sameAs: author.sameAs } : {}),
    },
  };

  const initials = author.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span
          aria-hidden
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-rf-gold font-display text-2xl font-bold text-rf-bg"
        >
          {initials}
        </span>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-rf-fg">{author.displayName}</h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-rf-gold">{jobTitle}</p>
          <p className="max-w-2xl text-[15px] leading-relaxed text-rf-fg-subtle">{pick(author.bio, locale)}</p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-rf-fg">{pick(ARTICLES_TITLE, locale)}</h2>
        {articles.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-rf-fg-subtle">{pick(NO_ARTICLES, locale)}</p>
        )}
      </section>
    </div>
  );
}
