import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getMatchById } from "@/lib/data/matches";
import { MatchDetailClient } from "@/components/MatchDetailClient";
import { WatchFreeBlock } from "@/components/WatchFreeBlock";
import { buildAlternates } from "@/lib/seo/alternates";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [match, t, locale] = await Promise.all([getMatchById(id), getTranslations("matches"), getLocale()]);
  if (!match) return {};

  const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  return {
    title,
    description: `${title} — ${match.competition.name}. ${t("metaDescription")}`,
    alternates: buildAlternates(`/matches/${id}`, locale),
  };
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const match = await getMatchById(id);
  if (!match) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    startDate: match.kickoffAt,
    eventStatus:
      match.status === "CANCELLED"
        ? "https://schema.org/EventCancelled"
        : match.status === "POSTPONED"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
    location: match.venueName ? { "@type": "Place", name: match.venueName } : undefined,
    competitor: [
      { "@type": "SportsTeam", name: match.homeTeam.name },
      { "@type": "SportsTeam", name: match.awayTeam.name },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MatchDetailClient matchId={id} initialMatch={match} />
      <WatchFreeBlock videos={match.relatedVideos} />
    </div>
  );
}
