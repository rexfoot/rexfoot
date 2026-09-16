import { Rss } from "lucide-react";
import { getAllHeadlinesForAdmin } from "@/lib/data/aggregator-admin";
import { AggregatorModerationCard } from "@/components/admin/AggregatorModerationCard";
import { EmptyState } from "@/components/EmptyState";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

/**
 * File de revue de la vitrine de presse (agrégateur multi-médias, voir
 * apps/worker/src/jobs/aggregator/aggregateHeadlines.ts) — chaque sujet
 * détecté reste en DRAFT jusqu'à validation manuelle ici. Une fois la
 * fiabilité du clustering automatique établie, cette étape pourra sauter
 * (publication directe), mais pas avant.
 */
export default async function AdminAggregatorPage() {
  await requireAdminPagePermission("viewAggregator");
  const headlines = await getAllHeadlinesForAdmin();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Vitrine de presse</h1>

      {headlines.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="Aucun sujet détecté pour l'instant"
          description="L'agrégateur tourne toutes les 20 minutes sur les flux RSS déjà configurés — reviens un peu plus tard."
        />
      ) : (
        <div className="space-y-3">
          {headlines.map((headline) => (
            <AggregatorModerationCard
              key={headline.id}
              id={headline.id}
              title={headline.title}
              status={headline.status}
              firstSeenAt={headline.firstSeenAt.toISOString()}
              sources={headline.sources}
            />
          ))}
        </div>
      )}
    </div>
  );
}
