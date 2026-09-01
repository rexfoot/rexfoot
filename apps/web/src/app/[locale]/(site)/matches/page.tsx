import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getMatches } from "@/lib/data/matches";
import { getFeaturedCompetitions } from "@/lib/data/competitions";
import { MatchesListClient } from "@/components/MatchesListClient";
import { MatchesDateNav } from "@/components/MatchesDateNav";
import { CompetitionFilter } from "@/components/CompetitionFilter";

// Dynamique : évite tout appel Prisma au moment du `docker build` (DATABASE_URL
// n'existe qu'au runtime sur Railway) — voir page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Tous les matchs de football : en direct, résultats et calendrier à venir.",
};

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
      <h1 className="font-display text-2xl font-bold text-rf-fg">Matchs</h1>

      <MatchesDateNav selectedDate={date} />
      <CompetitionFilter competitions={competitions} selected={competition} date={date} />

      <MatchesListClient
        apiUrl={`/api/matches?${apiParams.toString()}`}
        initialMatches={matches}
        emptyTitle="Aucun match à cette date"
        emptyDescription="Change de date ou de compétition pour voir d'autres matchs."
      />

      {(pageNum > 1 || hasMore) && (
        <div className="flex justify-center gap-3 pt-2">
          {pageNum > 1 && (
            <Link
              href={buildHref(date, competition, pageNum - 1)}
              className="rounded-xl border border-rf-border px-4 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
            >
              ← Précédent
            </Link>
          )}
          {hasMore && (
            <Link
              href={buildHref(date, competition, pageNum + 1)}
              className="rounded-xl border border-rf-border px-4 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
