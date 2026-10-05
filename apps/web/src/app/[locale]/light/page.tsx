import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLightMatches, type LightMatch } from "@/lib/data/matches";
import { toIntlLocale } from "@/lib/intl-locale";
import { buildAlternates } from "@/lib/seo/alternates";

// Page utilitaire (pas de contenu SEO) : pas d'indexation, canonique vers
// l'accueil — évite tout contenu dupliqué avec /matches.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "RexFoot Léger",
    alternates: { canonical: "/" },
    robots: { index: false, follow: true },
    ...buildAlternates("/light", locale),
  };
}

function ScoreLine({ match, locale }: { match: LightMatch; locale: string }) {
  const time = new Date(match.kickoffAt).toLocaleString(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";
  const score =
    match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : "vs";
  return (
    <li>
      <Link href={`/matches/${match.id}`} className="block border-b border-rf-border py-2">
        <span className="block text-sm font-bold text-rf-fg">
          {isLive && <span className="mr-1 text-rf-live">● </span>}
          {match.homeTeam.name} {score} {match.awayTeam.name}
          {isLive && match.minute !== null ? ` (${match.minute}')` : ""}
        </span>
        <span className="block text-xs text-rf-fg-muted">
          {match.competition.name} · {time}
        </span>
      </Link>
    </li>
  );
}

/**
 * RexFoot Léger : scores en texte seul, zéro image, zéro JS client —
 * quelques Ko par page pour les petits forfaits data. Rafraîchie côté
 * serveur chaque minute (+ recharge auto navigateur).
 */
export default async function LightPage() {
  const [t, locale] = await Promise.all([getTranslations("matches"), getLocale()]);
  const { live, upcoming, results } = await getLightMatches();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Recharge auto sans JS (fonctionne même avec JS désactivé). */}
      <meta httpEquiv="refresh" content="60" />
      <h1 className="font-display text-xl font-bold text-rf-fg">{t("lightTitle")}</h1>
      <p className="mt-1 text-xs text-rf-fg-subtle">{t("lightRefresh")}</p>

      <h2 className="mt-6 font-display text-base font-bold text-rf-fg">{t("lightLive")}</h2>
      {live.length === 0 ? (
        <p className="py-2 text-sm text-rf-fg-muted">{t("lightEmpty")}</p>
      ) : (
        <ul>
          {live.map((m) => (
            <ScoreLine key={m.id} match={m} locale={locale} />
          ))}
        </ul>
      )}

      <h2 className="mt-6 font-display text-base font-bold text-rf-fg">{t("lightUpcoming")}</h2>
      <ul>
        {upcoming.map((m) => (
          <ScoreLine key={m.id} match={m} locale={locale} />
        ))}
      </ul>

      <h2 className="mt-6 font-display text-base font-bold text-rf-fg">{t("lightResults")}</h2>
      <ul>
        {results.map((m) => (
          <ScoreLine key={m.id} match={m} locale={locale} />
        ))}
      </ul>

      <p className="mt-6 text-xs text-rf-fg-subtle">
        <Link href="/" className="underline">
          RexFoot
        </Link>
      </p>
    </div>
  );
}
