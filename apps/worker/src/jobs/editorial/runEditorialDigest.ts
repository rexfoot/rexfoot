import { prisma } from "@rexfoot/db";
import { hasAiProviderConfigured } from "@rexfoot/ai-provider";
import { getEnv } from "@rexfoot/config";
import { textToHtml } from "../../lib/textToHtml.js";
import { generateUniqueNewsSlug } from "../../lib/slug.js";
import { logger } from "../../lib/logger.js";
import { notifyWriters } from "../../lib/notifyWriters.js";
import { fetchAllFeeds } from "./fetchFeeds.js";
import { identifyTopics, type TopicCandidate } from "./identifyTopics.js";
import { draftArticle } from "./draftArticle.js";
import { classifyBreakingSeverity } from "./classifySeverity.js";

const MAX_ARTICLES_PER_RUN = 5;

async function recordCoveredTopic(topic: TopicCandidate, articleId: string): Promise<void> {
  await prisma.coveredTopic.upsert({
    where: { topicKey: topic.topicKey },
    update: {},
    create: {
      topicKey: topic.topicKey,
      articleId,
      sourceUrls: topic.items.map((item) => item.link),
    },
  });
}

/**
 * Marque un brouillon fraîchement créé comme CANDIDAT breaking (jamais publié
 * automatiquement, voir classifySeverity.ts) : pose isBreaking + breakingPriority
 * mais laisse breakingSince à null — le chrono de 8h (BREAKING_NEWS_WINDOW_HOURS)
 * ne démarre qu'à l'approbation humaine (voir /api/admin/news/[id]/breaking-decision),
 * jamais dès la détection. Notifie immédiatement via WhatsApp (notifyWriters,
 * déjà utilisé pour les buts) avec un lien direct vers la fiche d'approbation —
 * le but est un délai humain de quelques secondes, pas un round-trip par email.
 */
async function flagBreakingCandidateIfNeeded(topic: TopicCandidate, articleId: string, title: string): Promise<void> {
  const severity = classifyBreakingSeverity(topic);
  if (!severity) return;

  await prisma.newsArticle.update({
    where: { id: articleId },
    data: { isBreaking: true, breakingPriority: severity },
  });

  const siteUrl = getEnv().NEXT_PUBLIC_SITE_URL;
  void notifyWriters(
    `🚨 Candidat breaking (${severity}) : "${title}" — approuver ou rejeter : ${siteUrl}/admin/news/${articleId}/edit`,
  );
  logger.info({ articleId, severity }, "Agent éditorial : candidat breaking signalé, approbation humaine requise");
}

/**
 * RECHERCHE (flux RSS) → VÉRIFICATION (regroupement multi-source, dédoublonnage)
 * → RÉDACTION (IA, article original) → file de CONTRÔLE humain.
 *
 * Ne publie JAMAIS : chaque article créé reste en `status: "DRAFT"` avec
 * `isAiDraft: true` — l'APPROBATION et la PUBLICATION restent un geste humain
 * volontaire dans /admin/news, strictement inchangé par cet agent. Un sujet
 * classé breaking (voir classifySeverity.ts) n'est JAMAIS publié plus vite que
 * les autres : seule une notification immédiate accélère la REVUE humaine,
 * jamais la publication elle-même (demande explicite de Hicham).
 */
export async function runEditorialDigest(): Promise<void> {
  if (!hasAiProviderConfigured()) {
    logger.info("Agent éditorial : aucun fournisseur IA configuré, run ignoré (jamais de contenu inventé sans IA)");
    return;
  }

  const items = await fetchAllFeeds();
  if (items.length === 0) {
    logger.warn("Agent éditorial : aucun item récupéré depuis les flux RSS, run ignoré");
    return;
  }

  const topics = await identifyTopics(items);
  logger.info({ itemsFetched: items.length, newTopics: topics.length }, "Agent éditorial : sujets identifiés");

  const candidates = topics.slice(0, MAX_ARTICLES_PER_RUN);
  let created = 0;

  for (const topic of candidates) {
    const draft = await draftArticle(topic);
    if (!draft) {
      // Pas de CoveredTopic ici : un échec de rédaction (souci IA transitoire,
      // JSON invalide) ne doit pas bannir le sujet pour 21 jours — il sera
      // retenté au prochain run si les flux RSS en reparlent toujours.
      continue;
    }

    const slug = await generateUniqueNewsSlug(draft.title);
    const article = await prisma.newsArticle.create({
      data: {
        title: draft.title,
        slug,
        summary: draft.summary || null,
        contentHtml: textToHtml(draft.content),
        category: draft.category,
        status: "DRAFT",
        isAiDraft: true,
        suggestedVideoUrl: draft.suggestedVideoUrl,
        suggestedCoverImageUrl: draft.suggestedCoverImageUrl,
        sources: {
          create: topic.items.map((item) => ({
            url: item.link,
            title: item.title,
            publisherName: item.publisherName,
          })),
        },
      },
    });

    await recordCoveredTopic(topic, article.id);
    created += 1;
    logger.info({ title: article.title, sources: topic.items.length }, "Agent éditorial : brouillon créé");

    await flagBreakingCandidateIfNeeded(topic, article.id, article.title);
  }

  logger.info({ topicsConsidered: candidates.length, draftsCreated: created }, "Agent éditorial : run terminé");
}
