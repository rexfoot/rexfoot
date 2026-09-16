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
 * Publie automatiquement un brouillon classé breaking (voir classifySeverity.ts)
 * — décision explicite de Hicham (2026-09-16) de retirer l'étape d'approbation
 * humaine ici, gardée uniquement comme garde-fou a posteriori (voir isBreaking
 * éditable à tout moment dans /admin/news, kill-switch pour retirer une
 * publication erronée). `breakingSince` démarre au moment réel de la
 * publication, pas à la détection.
 *
 * Le worker ne peut pas déclencher la publication Facebook / l'indexation SEO
 * (code côté apps/web, autre process — voir /api/admin/news/[id]/route.ts) :
 * un article auto-publié comme breaking n'est donc PAS relayé sur Facebook ni
 * ré-indexé automatiquement, contrairement à une publication manuelle depuis
 * /admin/news. Écart connu, pas un oubli — construire un appel authentifié
 * worker -> web pour ça n'a pas été demandé, à revisiter si Hicham le souhaite.
 *
 * La notification WhatsApp (notifyWriters, déjà utilisée pour les buts) reste
 * essentielle : c'est elle qui rend le garde-fou exploitable en pratique — sans
 * elle, Hicham ne saurait pas qu'un breaking vient de partir tout seul.
 */
async function publishIfBreaking(topic: TopicCandidate, articleId: string, title: string): Promise<void> {
  const severity = classifyBreakingSeverity(topic);
  if (!severity) return;

  const now = new Date();
  await prisma.newsArticle.update({
    where: { id: articleId },
    data: { status: "PUBLISHED", publishedAt: now, isBreaking: true, breakingPriority: severity, breakingSince: now },
  });

  const siteUrl = getEnv().NEXT_PUBLIC_SITE_URL;
  void notifyWriters(
    `🚨 Breaking publié automatiquement (${severity}) : "${title}" — vérifier/retirer si besoin : ${siteUrl}/admin/news/${articleId}/edit`,
  );
  logger.info({ articleId, severity }, "Agent éditorial : candidat breaking publié automatiquement");
}

/**
 * RECHERCHE (flux RSS) → VÉRIFICATION (regroupement multi-source, dédoublonnage)
 * → RÉDACTION (IA, article original) → file de CONTRÔLE humain.
 *
 * Chaque article créé reste en `status: "DRAFT"` avec `isAiDraft: true` —
 * l'approbation reste un geste humain volontaire dans /admin/news, SAUF pour
 * un sujet classé breaking (voir classifySeverity.ts et publishIfBreaking
 * ci-dessus) : celui-ci est publié automatiquement dès la détection, décision
 * explicite de Hicham (2026-09-16) qui remplace l'approbation rapide en un
 * clic mise en place plus tôt — le seuil de sources par sévérité (voir
 * classifySeverity.ts) et la notification WhatsApp immédiate restent le seul
 * filet avant publication, la revue humaine devient a posteriori.
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

    await publishIfBreaking(topic, article.id, article.title);
  }

  logger.info({ topicsConsidered: candidates.length, draftsCreated: created }, "Agent éditorial : run terminé");
}
