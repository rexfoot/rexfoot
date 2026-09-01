import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMatchById } from "@/lib/data/matches";
import { MatchDetailClient } from "@/components/MatchDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [match, t] = await Promise.all([getMatchById(id), getTranslations("matches")]);
  if (!match) return {};

  const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  return {
    title,
    description: `${title} — ${match.competition.name}. ${t("metaDescription")}`,
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MatchDetailClient matchId={id} initialMatch={match} />
    </div>
  );
}
