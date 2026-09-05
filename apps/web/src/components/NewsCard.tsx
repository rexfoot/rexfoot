import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Newspaper } from "lucide-react";
import type { NewsCategory } from "@rexfoot/db";
import { formatArticleDate } from "@/lib/date";
import { toIntlLocale } from "@/lib/intl-locale";
import { isCurrentlyBreaking } from "@/lib/breaking";
import { BreakingBadge } from "@/components/BreakingBadge";
import { AnalysisBadge } from "@/components/AnalysisBadge";

interface NewsCardProps {
  article: {
    slug: string;
    title: string;
    summary: string | null;
    coverImageUrl: string | null;
    publishedAt: Date | null;
    isBreaking?: boolean;
    breakingSince?: Date | null;
    category?: NewsCategory;
  };
}

export function NewsCard({ article }: NewsCardProps) {
  const locale = useLocale();
  const date = formatArticleDate(article.publishedAt, toIntlLocale(locale));
  const breaking = isCurrentlyBreaking(article.isBreaking ?? false, article.breakingSince ?? null);

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group block overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card transition-colors hover:border-rf-gold/40"
    >
      <div className="relative aspect-video overflow-hidden bg-rf-bg-elevated">
        {article.coverImageUrl ? (
          // object-top plutôt que le centre par défaut : les photos de presse (portrait/carré)
          // laissent peu de marge au-dessus du visage, un recadrage centré coupe souvent la tête.
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            unoptimized
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="text-rf-fg-subtle" size={24} />
          </div>
        )}
      </div>
      <div className="p-4">
        {breaking && <BreakingBadge className="mb-2" />}
        {!breaking && article.category === "ANALYSES" && <AnalysisBadge className="mb-2" />}
        <h3 className="line-clamp-2 font-medium text-rf-fg">{article.title}</h3>
        {article.summary && <p className="mt-1 line-clamp-2 text-sm text-rf-fg-muted">{article.summary}</p>}
        {date && <p className="mt-2 text-xs font-medium text-rf-fg-subtle">{date}</p>}
      </div>
    </Link>
  );
}
