import { prisma } from "@rexfoot/db";
import { logger } from "../../lib/logger.js";
import { fetchAllFeeds, type FeedItem } from "../editorial/fetchFeeds.js";
import { clusterFeedItems, significantWords, titleSimilarity, type TopicCandidate } from "../editorial/identifyTopics.js";

// Fenêtre pendant laquelle une AggregatedHeadline reste "ouverte" pour
// accueillir de nouvelles sources — un flux RSS ne montre qu'une fenêtre
// glissante récente, donc le même sujet réapparaît sous un titre légèrement
// différent (autre média) à chaque cycle sans jamais reproduire le topicKey
// exact du cycle précédent. Sans ce ré-appariement flou contre les headlines
// déjà connues, chaque nouveau média sur le même sujet créerait une carte en
// double au lieu d'enrichir la carte existante.
const MATCH_WINDOW_HOURS = 72;
const MATCH_SIMILARITY_THRESHOLD = 0.5;
const OG_IMAGE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Repli quand le flux RSS n'expose aucune image exploitable — jamais une
 * photo rehébergée en haute résolution, seulement l'URL officielle du média
 * (même principe que extractSuggestedCoverImageUrl dans draftArticle.ts,
 * dupliqué ici plutôt que partagé : l'agrégateur et l'agent éditorial restent
 * deux features indépendantes).
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RexFootBot/1.0)" },
      signal: AbortSignal.timeout(OG_IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    return match?.[1] ?? null;
  } catch (cause) {
    logger.warn({ url, cause }, "Agrégateur : échec récupération og:image, ignoré");
    return null;
  }
}

async function resolveThumbnail(item: FeedItem): Promise<string | null> {
  if (item.imageUrl) return item.imageUrl;
  return fetchOgImage(item.link);
}

/**
 * Vitrine de presse multi-médias — jamais le texte complet d'un article,
 * seulement titre/court extrait/vignette/lien direct (voir AggregatedHeadline
 * dans schema.prisma). Publication automatique (décision explicite de Hicham,
 * 2026-09-16 : la revue manuelle initiale a servi à valider la fiabilité du
 * clustering, plus nécessaire) — /admin/aggregator reste disponible comme
 * garde-fou a posteriori (REJECTED retire une carte déjà publiée), jamais
 * comme étape bloquante avant publication. Réutilise le même clustering que
 * l'agent éditorial (clusterFeedItems) et les mêmes flux RSS
 * (EDITORIAL_SOURCE_FEEDS) — les deux features consomment les mêmes items
 * sans se coordonner entre elles (une même actu peut apparaître à la fois
 * comme carte agrégateur ET comme article original RexFoot, ce n'est pas un
 * doublon à éviter, ce sont deux choses différentes).
 */
export async function aggregateHeadlines(): Promise<void> {
  const items = await fetchAllFeeds();
  if (items.length === 0) {
    logger.warn("Agrégateur : aucun item récupéré depuis les flux RSS, run ignoré");
    return;
  }

  const clusters = clusterFeedItems(items);

  const since = new Date(Date.now() - MATCH_WINDOW_HOURS * 60 * 60 * 1000);
  const recentHeadlines = await prisma.aggregatedHeadline.findMany({
    where: { status: { not: "REJECTED" }, firstSeenAt: { gte: since } },
    select: { id: true, title: true, sources: { select: { url: true } } },
  });

  let created = 0;
  let enriched = 0;

  for (const cluster of clusters) {
    const clusterWords = significantWords(cluster.title);
    const match = recentHeadlines.find(
      (headline) => titleSimilarity(clusterWords, significantWords(headline.title)) >= MATCH_SIMILARITY_THRESHOLD,
    );

    const targetId = match ? match.id : (await createHeadline(cluster)).id;
    if (!match) {
      created += 1;
      continue;
    }

    const existingUrls = new Set(match.sources.map((s) => s.url));
    const newItems = dedupeByUrl(cluster.items.filter((item) => !existingUrls.has(item.link)));
    if (newItems.length === 0) continue;

    for (const item of newItems) {
      const thumbnailUrl = await resolveThumbnail(item);
      await prisma.aggregatedHeadlineSource
        .create({
          data: {
            headlineId: targetId,
            publisherName: item.publisherName,
            title: item.title,
            url: item.link,
            excerpt: item.summary || null,
            thumbnailUrl,
            publishedAt: item.publishedAt,
          },
        })
        .catch(() => {
          // Course rare entre deux cycles sur la même URL (contrainte unique
          // [headlineId, url]) — sans conséquence, la source existe déjà.
        });
    }
    match.sources.push(...newItems.map((i) => ({ url: i.link })));
    enriched += 1;
  }

  logger.info({ clustersSeen: clusters.length, created, enriched }, "Agrégateur : run terminé");
}

/**
 * Un même flux (ou deux flux distincts) peut lister deux fois la même URL au
 * sein d'un même cycle (ex. entrée mise à jour republiée) — clusterFeedItems
 * les regroupe alors dans le même TopicCandidate.items sans les dédupliquer,
 * ce qui violerait la contrainte unique (headlineId, url). Jamais un bug côté
 * DB à masquer par un try/catch : la vraie source (items en double) doit être
 * nettoyée avant l'écriture.
 */
function dedupeByUrl(items: TopicCandidate["items"]): TopicCandidate["items"] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

async function createHeadline(cluster: TopicCandidate) {
  const headline = await prisma.aggregatedHeadline.create({
    data: { topicKey: cluster.topicKey, title: cluster.title, status: "PUBLISHED" },
  });

  for (const item of dedupeByUrl(cluster.items)) {
    const thumbnailUrl = await resolveThumbnail(item);
    await prisma.aggregatedHeadlineSource.create({
      data: {
        headlineId: headline.id,
        publisherName: item.publisherName,
        title: item.title,
        url: item.link,
        excerpt: item.summary || null,
        thumbnailUrl,
        publishedAt: item.publishedAt,
      },
    });
  }

  return headline;
}
