import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { ListOrdered } from "lucide-react";
import { getFeaturedCompetitions } from "@/lib/data/competitions";
import { CompetitionCard } from "@/components/CompetitionCard";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("standings"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/classements", locale) };
}

export default async function StandingsIndexPage() {
  const t = await getTranslations("standings");
  const competitions = await getFeaturedCompetitions();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-rf-fg">
        <ListOrdered className="text-rf-standings" size={22} />
        {t("title")}
      </h1>

      {competitions.length === 0 ? (
        <EmptyState icon={ListOrdered} title={t("noCompetitions")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.slug} competition={competition} />
          ))}
        </div>
      )}
    </div>
  );
}
