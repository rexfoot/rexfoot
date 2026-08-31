import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";

interface NewsCardProps {
  article: {
    slug: string;
    title: string;
    summary: string | null;
    coverImageUrl: string | null;
    publishedAt: Date | null;
  };
}

export function NewsCard({ article }: NewsCardProps) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="block overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card transition-colors hover:border-rf-gold/40"
    >
      <div className="relative aspect-video bg-rf-bg-elevated">
        {article.coverImageUrl ? (
          <Image src={article.coverImageUrl} alt={article.title} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Newspaper className="text-rf-fg-subtle" size={24} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-medium text-rf-fg">{article.title}</h3>
        {article.summary && <p className="mt-1 line-clamp-2 text-sm text-rf-fg-muted">{article.summary}</p>}
      </div>
    </Link>
  );
}
