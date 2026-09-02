import { createAiProvider, AiProviderError } from "@rexfoot/ai-provider";
import { logger } from "../../lib/logger.js";
import type { TopicCandidate } from "./identifyTopics.js";

const NEWS_CATEGORIES = [
  "TRANSFERTS",
  "RESULTATS",
  "ANALYSES",
  "INTERVIEWS",
  "COMPETITIONS",
  "INTERNATIONAL",
  "AUTRE",
] as const;
type NewsCategoryValue = (typeof NEWS_CATEGORIES)[number];

export interface ArticleDraft {
  title: string;
  summary: string;
  content: string;
  category: NewsCategoryValue;
  suggestedVideoUrl: string | null;
  suggestedCoverImageUrl: string | null;
}

const SYSTEM_PROMPT = `Tu es journaliste pour RexFoot, un média sportif francophone. On te donne une liste de titres et résumés courts glanés sur plusieurs sites d'actualité sportive — jamais le corps de leurs articles.

Règles strictes :
- Rédige un article ORIGINAL en français, avec ton propre style et ta propre structure de phrases — ne recopie JAMAIS une formulation des titres/résumés fournis.
- Ne rapporte QUE ce qui est explicitement présent dans les titres/résumés donnés. N'invente aucun chiffre, aucune date, aucun nom, aucune déclaration qui n'y figure pas.
- Si une seule source rapporte l'information, utilise une prudence éditoriale explicite ("selon [source]...", "l'information est avancée par..."). Si plusieurs sources concordent, tu peux l'affirmer plus directement, en le mentionnant.
- Réponds STRICTEMENT en JSON valide, sans texte avant ou après, avec ce format exact :
{"title": "...", "summary": "...", "content": "...", "category": "TRANSFERTS|RESULTATS|ANALYSES|INTERVIEWS|COMPETITIONS|INTERNATIONAL|AUTRE"}
"content" doit contenir plusieurs paragraphes séparés par des doubles sauts de ligne ("\\n\\n"), en texte brut, jamais de HTML.`;

const YOUTUBE_URL_PATTERN = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+)/i;

function buildPrompt(topic: TopicCandidate): string {
  const sourcesText = topic.items
    .map((item) => `- [${item.publisherName}] ${item.title}${item.summary ? ` — ${item.summary}` : ""} (${item.link})`)
    .join("\n");
  return `Sujet à traiter, à partir de ${topic.items.length} source(s) réelle(s) :\n${sourcesText}`;
}

/**
 * Best-effort : un flux RSS classique n'inclut quasiment jamais de lien vidéo
 * exploitable, donc ceci renverra `null` la plupart du temps — c'est honnête,
 * pas un échec. Aucune vidéo n'est jamais générée ou devinée.
 */
function extractSuggestedVideoUrl(topic: TopicCandidate): string | null {
  for (const item of topic.items) {
    const match = item.summary.match(YOUTUBE_URL_PATTERN) ?? item.link.match(YOUTUBE_URL_PATTERN);
    if (match) return match[0];
  }
  return null;
}

/**
 * Best-effort, même logique que extractSuggestedVideoUrl : on prend la
 * première image trouvée parmi les sources du sujet (voir extractImageUrl
 * dans fetchFeeds.ts) — jamais d'image générée ou devinée.
 */
function extractSuggestedCoverImageUrl(topic: TopicCandidate): string | null {
  for (const item of topic.items) {
    if (item.imageUrl) return item.imageUrl;
  }
  return null;
}

function isValidCategory(value: unknown): value is NewsCategoryValue {
  return typeof value === "string" && (NEWS_CATEGORIES as readonly string[]).includes(value);
}

/** Rédige un brouillon à partir d'un sujet — renvoie `null` si l'IA échoue ou renvoie une réponse inexploitable (jamais de contenu de repli inventé). */
export async function draftArticle(topic: TopicCandidate): Promise<ArticleDraft | null> {
  const provider = createAiProvider();

  let raw: string;
  try {
    raw = await provider.generateText({ system: SYSTEM_PROMPT, prompt: buildPrompt(topic), maxTokens: 900 });
  } catch (error) {
    if (error instanceof AiProviderError) {
      logger.warn({ topic: topic.title, error: error.message }, "Agent éditorial : échec IA, sujet ignoré");
      return null;
    }
    throw error;
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.warn({ topic: topic.title }, "Agent éditorial : réponse IA sans JSON exploitable, sujet ignoré");
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<Record<"title" | "summary" | "content" | "category", string>>;
    if (!parsed.title || !parsed.content) {
      logger.warn({ topic: topic.title }, "Agent éditorial : JSON incomplet, sujet ignoré");
      return null;
    }

    return {
      title: parsed.title,
      summary: parsed.summary ?? "",
      content: parsed.content,
      category: isValidCategory(parsed.category) ? parsed.category : "AUTRE",
      suggestedVideoUrl: extractSuggestedVideoUrl(topic),
      suggestedCoverImageUrl: extractSuggestedCoverImageUrl(topic),
    };
  } catch (cause) {
    logger.warn({ topic: topic.title, cause }, "Agent éditorial : JSON invalide, sujet ignoré");
    return null;
  }
}
