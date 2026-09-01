import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMatches } from "@/lib/data/matches";
import { getFeaturedCompetitions } from "@/lib/data/competitions";
import { MatchesListClient } from "@/components/MatchesListClient";
import { MatchesDateNav } from "@/components/MatchesDateNav";
import { CompetitionFilter } from "@/components/CompetitionFilter";

// Dynamique : évite tout appel Prisma au moment du `docker build` (DATABASE_URL
// n'existe qu'au runtime sur Railway) — voir page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("matches");
  return { title: t("title"), description: t("metaDescription") };
}

interface PageProps {
  searchParams: Promise<{ date?: string; competition?: string; page?: string }>;
}

function buildHref(date: string | undefined, competition: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (competition) params.set("competition", competition);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/matches?${query}` : "/matches";
}

export default async function MatchesPage({ searchParams }: PageProps) {
  const t = await getTranslations("matches");
  const { date, competition, page } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const parsedDate = date ? new Date(`${date}T12:00:00`) : new Date();

  const [{ matches, hasMore }, competitions] = await Promise.all([
    getMatches({ date: parsedDate, competitionSlug: competition, page: pageNum }),
    getFeaturedCompetitions(),
  ]);

  const apiParams = new URLSearchParams();
  apiParams.set("date", parsedDate.toISOString());
  if (competition) apiParams.set("competition", competition);
  if (pageNum > 1) apiParams.set("page", String(pageNum));

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>

      <MatchesDateNav selectedDate={date} />
      <CompetitionFilter competitions={competitions} selected={competition} date={date} />

      <MatchesListClient
        apiUrl={`/api/matches?${apiParams.toString()}`}
        initialMatches={matches}
        emptyTitle={t("noMatchesTitle")}
        emptyDescription={t("noMatchesDescription")}
      />

      {(pageNum > 1 || hasMore) && (
        <div className="flex justify-center gap-3 pt-2">
          {pageNum > 1 && (
            <Link
              href={buildHref(date, competition, pageNum - 1)}
              className="flex items-center gap-1 rounded-xl border border-rf-border px-4 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
            >
              <ChevronLeft size={16} className="rtl:rotate-180" /> {t("previous")}
            </Link>
          )}
          {hasMore && (
            <Link
              href={buildHref(date, competition, pageNum + 1)}
              className="flex items-center gap-1 rounded-xl border border-rf-border px-4 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
            >
              {t("next")} <ChevronRight size={16} className="rtl:rotate-180" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
