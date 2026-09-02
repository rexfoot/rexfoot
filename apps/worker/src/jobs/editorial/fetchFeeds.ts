import { XMLParser } from "fast-xml-parser";
import { EDITORIAL_SOURCE_FEEDS } from "@rexfoot/config";
import { logger } from "../../lib/logger.js";

export interface FeedItem {
  title: string;
  link: string;
  summary: string;
  publisherName: string;
  publishedAt: Date | null;
  imageUrl: string | null;
}

const FETCH_TIMEOUT_MS = 15_000;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true });

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Best-effort, comme extractSuggestedVideoUrl côté draftArticle : un flux RSS
 * classique n'expose une image que via <enclosure>, le namespace Media RSS
 * (media:content/media:thumbnail), ou parfois une <img> collée dans la
 * description HTML. On tente les trois, dans cet ordre, et on renvoie `null`
 * sans bruit si aucun ne donne rien — jamais d'image devinée ou générée ici.
 */
function extractImageUrl(item: Record<string, unknown>, rawDescription: string): string | null {
  const enclosures = toArray(item.enclosure as { "@_url"?: string; "@_type"?: string } | Array<{ "@_url"?: string; "@_type"?: string }> | undefined);
  for (const enclosure of enclosures) {
    if (enclosure?.["@_url"] && (!enclosure["@_type"] || enclosure["@_type"].startsWith("image/"))) {
      return enclosure["@_url"];
    }
  }

  const mediaContents = toArray(
    item["media:content"] as { "@_url"?: string; "@_medium"?: string } | Array<{ "@_url"?: string; "@_medium"?: string }> | undefined,
  );
  for (const media of mediaContents) {
    if (media?.["@_url"] && (!media["@_medium"] || media["@_medium"] === "image")) {
      return media["@_url"];
    }
  }

  const thumbnails = toArray(item["media:thumbnail"] as { "@_url"?: string } | Array<{ "@_url"?: string }> | undefined);
  if (thumbnails[0]?.["@_url"]) return thumbnails[0]["@_url"];

  const imgMatch = rawDescription.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1] ?? null;

  return null;
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
        imageUrl: extractImageUrl(item, rawSummary),
      };
    })
    .filter((item): item is FeedItem => item !== null);
}

/** Récupère et aplatit tous les flux configurés (EDITORIAL_SOURCE_FEEDS) — jamais le corps des articles, juste titre/résumé/lien. */
export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.all(EDITORIAL_SOURCE_FEEDS.map(fetchOneFeed));
  return results.flat();
}
