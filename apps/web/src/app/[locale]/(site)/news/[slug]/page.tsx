import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_NAME } from "@rexfoot/config";
import { getNewsArticleBySlug } from "@/lib/data/news";
import { toIntlLocale } from "@/lib/intl-locale";
import { TrackView } from "@/components/TrackView";
import { ShareButtons } from "@/components/ShareButtons";
import { ArticleSignature } from "@/components/ArticleSignature";
import { buildAlternates, localizedUrl } from "@/lib/seo/alternates";
import { getAuthorByName } from "@/lib/authors";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const article = await getNewsArticleBySlug(slug, locale);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary ?? undefined,
    // Cover en og:image ET twitter:image (sinon twitter hériterait l'image
    // globale du layout au lieu de la cover — voir layout [locale]).
    // `type: "article"` explicite : l'openGraph de la page remplace celui du
    // layout (fusion superficielle de Next), donc sans ça og:type disparaissait.
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary ?? undefined,
      images: [
        article.coverImageUrl
          ? { url: article.coverImageUrl }
          : { url: "/opengraph-image.jpg", width: 1200, height: 630, alt: SITE_NAME },
      ],
    },
    twitter: article.coverImageUrl ? { images: [{ url: article.coverImageUrl }] } : undefined,
    alternates: buildAlternates(`/news/${slug}`, locale),
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const [locale, t] = await Promise.all([getLocale(), getTranslations("news")]);
  const article = await getNewsArticleBySlug(slug, locale);
  if (!article) notFound();

  const articleUrl = localizedUrl(locale, `/news/${slug}`);
  const authorProfile = getAuthorByName(article.author?.displayName);
  const authorPath = authorProfile ? `/auteur/${authorProfile.slug}` : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary ?? undefined,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: (article.updatedAt ?? article.publishedAt)?.toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    author: article.author
      ? {
          "@type": "Person",
          name: article.author.displayName,
          ...(authorPath ? { url: localizedUrl(locale, authorPath), "@id": `${siteUrl}${authorPath}#person` } : {}),
        }
      : { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo-crown.png` },
    },
  };

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackView entityType="ARTICLE" entityId={article.id} />

      {article.coverImageUrl && (
        <div className="overflow-hidden rounded-2xl bg-rf-bg-card">
          {/* Page article : la photo est affichée en ENTIER, à ses vraies
              proportions (aucun recadrage) — width/height ne servent qu'au
              calcul du srcset, h-auto garde le ratio réel de l'image. */}
          {/* Optimizer Next (WebP + srcset) si cover locale /api/assets/...,
              `unoptimized` sinon (covers externes : pas de remotePatterns). */}
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            width={1200}
            height={675}
            unoptimized={!article.coverImageUrl.startsWith("/")}
            priority
            sizes="(max-width: 768px) 100vw, 672px"
            className="mx-auto block h-auto max-h-[75vh] w-full object-contain"
          />
        </div>
      )}

      <h1 className="font-display text-2xl font-bold text-rf-fg">{article.title}</h1>
      {article.publishedAt && (
        <p className="text-xs text-rf-fg-subtle">
          {new Date(article.publishedAt).toLocaleDateString(toIntlLocale(locale), { dateStyle: "long" })}
        </p>
      )}

      <ShareButtons title={article.title} />

      <div
        className="space-y-4 text-[15px] leading-relaxed text-rf-fg [&_a]:text-rf-gold [&_a]:underline [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />

      <ArticleSignature name={article.author?.displayName ?? SITE_NAME} label={t("writtenBy")} href={authorPath} />
    </article>
  );
}
