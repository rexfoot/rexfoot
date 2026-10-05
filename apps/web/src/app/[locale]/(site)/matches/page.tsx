import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMatches } from "@/lib/data/matches";
import { getFeaturedCompetitions } from "@/lib/data/competitions";
import { MatchesListClient } from "@/components/MatchesListClient";
import { MatchesDateNav } from "@/components/MatchesDateNav";
import { CompetitionFilter } from "@/components/CompetitionFilter";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` (DATABASE_URL
// n'existe qu'au runtime sur Railway) — voir page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("matches"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/matches", locale) };
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

  // Le shell (titre, nav dates) part immédiatement ; les deux requêtes DB
  // streament chacune dans leur <Suspense> — FCP/LCP-texte sans attendre Prisma.
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-rf-fg">
        <CalendarDays className="text-rf-matches" size={22} />
        {t("title")}
      </h1>

      <MatchesDateNav selectedDate={date} />
      <Suspense fallback={<CompetitionFilterSkeleton />}>
        <CompetitionFilterLoader competition={competition} date={date} />
      </Suspense>
      <Suspense fallback={<MatchesListSkeleton />}>
        <MatchesListLoader parsedDate={parsedDate} competition={competition} pageNum={pageNum} date={date} />
      </Suspense>
    </div>
  );
}

/** Skeletons animés (jamais de texte "chargement…") — même convention que l'accueil. */
function CompetitionFilterSkeleton() {
  return (
    <div className="-mx-4 flex gap-2 overflow-hidden px-4 pb-1 sm:mx-0 sm:px-0" aria-hidden>
      {["w-24", "w-32", "w-28", "w-36"].map((w) => (
        <div key={w} className={`h-9 shrink-0 animate-pulse rounded-full bg-rf-bg-elevated ${w}`} />
      ))}
    </div>
  );
}

function MatchesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-rf-border bg-rf-bg-card p-4">
          <div className="mx-auto h-4 w-24 rounded bg-rf-bg-elevated" />
          <div className="mt-4 space-y-3">
            <div className="h-6 w-3/4 rounded bg-rf-bg-elevated" />
            <div className="h-6 w-2/3 rounded bg-rf-bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function CompetitionFilterLoader({ competition, date }: { competition?: string; date?: string }) {
  const competitions = await getFeaturedCompetitions();
  return <CompetitionFilter competitions={competitions} selected={competition} date={date} />;
}

async function MatchesListLoader({
  parsedDate,
  competition,
  pageNum,
  date,
}: {
  parsedDate: Date;
  competition?: string;
  pageNum: number;
  date?: string;
}) {
  const t = await getTranslations("matches");
  const { matches, hasMore } = await getMatches({ date: parsedDate, competitionSlug: competition, page: pageNum });

  const apiParams = new URLSearchParams();
  apiParams.set("date", parsedDate.toISOString());
  if (competition) apiParams.set("competition", competition);
  if (pageNum > 1) apiParams.set("page", String(pageNum));

  return (
    <>
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
    </>
  );
}
