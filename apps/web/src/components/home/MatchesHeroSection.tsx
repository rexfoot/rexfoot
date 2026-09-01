import { CalendarX } from "lucide-react";
import { getFeaturedMatch, getMatchesOfTheDay } from "@/lib/data/matches";
import { MatchHero } from "@/components/MatchHero";
import { LiveMatchMiniCard } from "@/components/LiveMatchMiniCard";
import { EmptyState } from "@/components/EmptyState";

/** Match vedette + autres matchs du jour — fetch isolé pour streamer indépendamment des autres sections. */
export async function MatchesHeroSection() {
  const [featured, todayMatches] = await Promise.all([getFeaturedMatch(), getMatchesOfTheDay()]);

  if (!featured) {
    return (
      <EmptyState
        icon={CalendarX}
        title="Aucun match aujourd'hui"
        description="Reviens plus tard, ou consulte le calendrier complet des compétitions."
      />
    );
  }

  const otherMatches = todayMatches.filter((match) => match.id !== featured.id).slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <MatchHero initialMatch={featured} />
      </div>
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold tracking-wide text-rf-fg-muted uppercase">Autres matchs du jour</h3>
        {otherMatches.length === 0 ? (
          <p className="text-sm text-rf-fg-subtle">Pas d&apos;autre match aujourd&apos;hui.</p>
        ) : (
          <div className="space-y-2">
            {otherMatches.map((match) => (
              <LiveMatchMiniCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
