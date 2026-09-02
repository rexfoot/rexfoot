import { XMLParser } from "fast-xml-parser";
import { EDITORIAL_SOURCE_FEEDS } from "@rexfoot/config";
import { logger } from "../../lib/logger.js";

export interface FeedItem {
  title: string;
  link: string;
  summary: string;
  publisherName: string;
  publishedAt: Date | null;
}

const FETCH_TIMEOUT_MS = 15_000;
const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Un flux mort, lent ou mal formé ne doit jamais faire échouer les autres —
 * chaque flux est isolé dans son propre try/catch (pas de Promise.all qui
 * échouerait en bloc au premier flux en erreur).
 */
async function fetchOneFeed(feed: { publisherName: string; url: string }): Promise<FeedItem[]> {
  let response: Response;
  try {
    response = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RexFootBot/1.0)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (cause) {
    logger.warn({ publisher: feed.publisherName, cause }, "Flux RSS : échec réseau, ignoré");
    return [];
  }

  if (!response.ok) {
    logger.warn({ publisher: feed.publisherName, status: response.status }, "Flux RSS : réponse en erreur, ignoré");
    return [];
  }

  const xml = await response.text();
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (cause) {
    logger.warn({ publisher: feed.publisherName, cause }, "Flux RSS : XML illisible, ignoré");
    return [];
  }

  const channel = (parsed as { rss?: { channel?: { item?: unknown } } }).rss?.channel;
  const rawItems = toArray(channel?.item) as Array<Record<string, unknown>>;

  return rawItems
    .map((item): FeedItem | null => {
      const title = typeof item.title === "string" ? stripHtml(item.title) : null;
      const link = typeof item.link === "string" ? item.link.trim() : null;
      if (!title || !link) return null;

      const rawSummary = typeof item.description === "string" ? item.description : "";
      const pubDate = typeof item.pubDate === "string" ? new Date(item.pubDate) : null;

      return {
        title,
        link,
        summary: stripHtml(rawSummary).slice(0, 500),
        publisherName: feed.publisherName,
        publishedAt: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate : null,
      };
    })
    .filter((item): item is FeedItem => item !== null);
}

/** Récupère et aplatit tous les flux configurés (EDITORIAL_SOURCE_FEEDS) — jamais le corps des articles, juste titre/résumé/lien. */
export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.all(EDITORIAL_SOURCE_FEEDS.map(fetchOneFeed));
  return results.flat();
}
