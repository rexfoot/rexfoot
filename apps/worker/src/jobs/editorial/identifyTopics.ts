import { prisma } from "@rexfoot/db";
import type { FeedItem } from "./fetchFeeds.js";

export interface TopicCandidate {
  topicKey: string;
  title: string;
  items: FeedItem[];
}

const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "et", "en", "au", "aux", "pour", "avec", "sur", "dans",
  "the", "a", "an", "of", "to", "and", "in", "on", "for", "with", "at", "by",
  "el", "los", "las", "una", "con", "por", "del", "que",
]);
const SIGNIFICANT_WORD_MIN_LENGTH = 4;
const SIMILARITY_THRESHOLD = 0.6;
const COVERED_LOOKBACK_DAYS = 21;

function normalize(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function significantWords(title: string): Set<string> {
  return new Set(
    normalize(title)
      .split(/\s+/)
      .filter((word) => word.length >= SIGNIFICANT_WORD_MIN_LENGTH && !STOPWORDS.has(word)),
  );
}

/** Similarité grossière (recoupement de mots significatifs) — suffisante pour regrouper des titres qui parlent du même sujet, pas une vraie clusterisation NLP. */
function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/**
 * Regroupe les items qui parlent probablement du même sujet (plusieurs
 * sources = corroboration visible dans le brouillon), puis écarte tout sujet
 * déjà traité dans les COVERED_LOOKBACK_DAYS derniers jours (voir CoveredTopic).
 */
export async function identifyTopics(items: FeedItem[]): Promise<TopicCandidate[]> {
  const clusters: TopicCandidate[] = [];

  for (const item of items) {
    const words = significantWords(item.title);
    const match = clusters.find((cluster) => similarity(words, significantWords(cluster.title)) >= SIMILARITY_THRESHOLD);
    if (match) {
      match.items.push(item);
    } else {
      clusters.push({ topicKey: normalize(item.title), title: item.title, items: [item] });
    }
  }

  const since = new Date(Date.now() - COVERED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const covered = await prisma.coveredTopic.findMany({
    where: { firstSeenAt: { gte: since } },
    select: { topicKey: true },
  });
  const coveredKeys = new Set(covered.map((c) => c.topicKey));

  return clusters.filter((cluster) => !coveredKeys.has(cluster.topicKey));
}
