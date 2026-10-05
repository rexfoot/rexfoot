import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Newspaper } from "lucide-react";
import { formatArticleDate } from "@/lib/date";
import { toIntlLocale } from "@/lib/intl-locale";
import { isCurrentlyBreaking } from "@/lib/breaking";
import { BreakingBadge } from "@/components/BreakingBadge";

interface NewsHeroProps {
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

/** Hero pleine largeur pour la une de l'accueil — image de fond, dégradé et titre en surimpression. */
export function NewsHero({ article }: NewsHeroProps) {
  const t = useTranslations("home");
  const locale = useLocale();
  const date = formatArticleDate(article.publishedAt, toIntlLocale(locale));
  const breaking = isCurrentlyBreaking(article.isBreaking ?? false, article.breakingSince ?? null);
  // Optimizer Next (WebP + resize + srcset) pour les covers servies par
  // /api/assets/... : ~500 Ko JPEG → ~50-80 Ko WebP (LCP accueil). Les covers
  // externes éventuelles restent `unoptimized` (l'optimizer exige
  // remotePatterns et répondrait 400).
  const optimizeCover = article.coverImageUrl?.startsWith("/") ?? false;

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card"
    >
      <div className="relative aspect-4/3 sm:aspect-16/7">
        {article.coverImageUrl ? (
          // object-top : voir NewsCard.tsx (même raison — évite de couper la tête sur un recadrage centré).
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            unoptimized={!optimizeCover}
            priority
            // sizes + priority + preload auto (Next émet le <link preload> dès
            // que la section streame) : le navigateur réserve la bonne taille
            // sans attendre la mise en page — LCP accueil.
            sizes="(max-width: 640px) 100vw, 1152px"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-rf-bg-elevated">
            <Newspaper className="text-rf-fg-subtle" size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
        {breaking ? (
          <BreakingBadge />
        ) : (
          <span className="inline-flex items-center rounded-full bg-rf-gold px-2.5 py-1 text-xs font-bold tracking-wide text-rf-bg uppercase">
            {t("featured")}
          </span>
        )}
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
