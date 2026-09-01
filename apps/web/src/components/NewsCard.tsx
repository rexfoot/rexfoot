import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Newspaper } from "lucide-react";
import { formatArticleDate } from "@/lib/date";
import { isCurrentlyBreaking } from "@/lib/breaking";
import { BreakingBadge } from "@/components/BreakingBadge";

interface NewsCardProps {
  article: {
    slug: string;
    title: string;
    summary: string | null;
    coverImageUrl: string | null;
    publishedAt: Date | null;
    isBreaking?: boolean;
    breakingSince?: Date | null;
  };
}

export function NewsCard({ article }: NewsCardProps) {
  const date = formatArticleDate(article.publishedAt);
  const breaking = isCurrentlyBreaking(article.isBreaking ?? false, article.breakingSince ?? null);

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group block overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card transition-colors hover:border-rf-gold/40"
    >
      <div className="relative aspect-video overflow-hidden bg-rf-bg-elevated">
        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="text-rf-fg-subtle" size={24} />
          </div>
        )}
      </div>
      <div className="p-4">
        {breaking && <BreakingBadge className="mb-2" />}
        <h3 className="line-clamp-2 font-medium text-rf-fg">{article.title}</h3>
        {article.summary && <p className="mt-1 line-clamp-2 text-sm text-rf-fg-muted">{article.summary}</p>}
        {date && <p className="mt-2 text-xs font-medium text-rf-fg-subtle">{date}</p>}
      </div>
    </Link>
  );
}
