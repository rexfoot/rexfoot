import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getNewsArticleBySlug } from "@/lib/data/news";
import { toIntlLocale } from "@/lib/intl-locale";
import { TrackView } from "@/components/TrackView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary ?? undefined,
    openGraph: article.coverImageUrl ? { images: [{ url: article.coverImageUrl }] } : undefined,
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const [article, locale] = await Promise.all([getNewsArticleBySlug(slug), getLocale()]);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    image: article.coverImageUrl ?? undefined,
    datePublished: article.publishedAt?.toISOString(),
    author: article.author ? { "@type": "Person", name: article.author.displayName } : undefined,
  };

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackView entityType="ARTICLE" entityId={article.id} />

      {article.coverImageUrl && (
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-rf-bg-card">
          <Image src={article.coverImageUrl} alt={article.title} fill unoptimized className="object-cover" />
        </div>
      )}

      <h1 className="font-display text-2xl font-bold text-rf-fg">{article.title}</h1>
      {article.publishedAt && (
        <p className="text-xs text-rf-fg-subtle">
          {new Date(article.publishedAt).toLocaleDateString(toIntlLocale(locale), { dateStyle: "long" })}
        </p>
      )}

      <div
        className="space-y-4 text-[15px] leading-relaxed text-rf-fg [&_a]:text-rf-gold [&_a]:underline [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />
    </article>
  );
}
