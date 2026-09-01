import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { formatArticleDate } from "@/lib/date";

interface NewsHeroProps {
  article: {
    slug: string;
    title: string;
    summary: string | null;
    coverImageUrl: string | null;
    publishedAt: Date | null;
  };
}

/** Hero pleine largeur pour la une de l'accueil — image de fond, dégradé et titre en surimpression. */
export function NewsHero({ article }: NewsHeroProps) {
  const date = formatArticleDate(article.publishedAt);

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card"
    >
      <div className="relative aspect-4/3 sm:aspect-16/7">
        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            unoptimized
            priority
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-rf-bg-elevated">
            <Newspaper className="text-rf-fg-subtle" size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
        <span className="inline-flex items-center rounded-full bg-rf-gold px-2.5 py-1 text-xs font-bold tracking-wide text-rf-bg uppercase">
          À la une
        </span>
        <h1 className="mt-3 line-clamp-3 font-display text-2xl font-extrabold text-white sm:text-4xl">
          {article.title}
        </h1>
        {article.summary && (
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/80 sm:text-base">{article.summary}</p>
        )}
        {date && <p className="mt-3 text-xs font-medium text-white/60">{date}</p>}
      </div>
    </Link>
  );
}
