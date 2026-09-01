import { getMatchesOfTheDay } from "@/lib/data/matches";
import { getPublishedNews } from "@/lib/data/news";
import { getPublishedTransfers } from "@/lib/data/transfers";

const CONTEXT_ITEM_LIMIT = 5;

/**
 * Instantané des données réelles du site, injecté dans le prompt du chat —
 * seule source de vérité autorisée pour les réponses sur matchs/actus/mercato.
 * Volontairement compact (5 éléments max par catégorie) pour garder un prompt
 * léger ; les états vides sont explicites plutôt que silencieusement absents,
 * pour que l'IA sache dire "je n'ai pas cette info" au lieu de deviner.
 */
export async function buildChatContext(): Promise<string> {
  const [matches, articles, transfers] = await Promise.all([
    getMatchesOfTheDay(),
    getPublishedNews(CONTEXT_ITEM_LIMIT),
    getPublishedTransfers(undefined, CONTEXT_ITEM_LIMIT),
  ]);

  const matchesText = matches.length
    ? matches
        .map(
          (m) =>
            `- ${m.homeTeam.name} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.awayTeam.name} (${m.competition.name}, statut : ${m.status})`,
        )
        .join("\n")
    : "Aucun match aujourd'hui dans la base RexFoot.";

  const newsText = articles.length
    ? articles.map((a) => `- ${a.title}${a.summary ? ` — ${a.summary}` : ""}`).join("\n")
    : "Aucun article publié pour l'instant.";

  const transfersText = transfers.length
    ? transfers
        .map((t) => {
          const fee = t.isFree ? "libre" : t.feeMillionEur ? `${t.feeMillionEur}M€` : "montant inconnu";
          return `- ${t.playerName} : ${t.fromClubName ?? "club inconnu"} → ${t.toClubName ?? "club inconnu"} (${t.status}, ${fee})`;
        })
        .join("\n")
    : "Aucun transfert publié pour l'instant.";

  return [
    "MATCHS DU JOUR :",
    matchesText,
    "",
    "DERNIÈRES ACTUALITÉS :",
    newsText,
    "",
    "DERNIERS TRANSFERTS :",
    transfersText,
  ].join("\n");
}
