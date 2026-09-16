import { prisma, type ArticleLocale } from "@rexfoot/db";
import { createAiProvider, AiProviderError, hasAiProviderConfigured } from "@rexfoot/ai-provider";
import { logger } from "../../lib/logger.js";
import { runAgentTask, entityIdsWithDoneTask } from "../../lib/agentTask.js";

const MAX_ARTICLES_PER_RUN = 10;

const LOCALES: readonly { locale: ArticleLocale; taskType: string; languageName: string }[] = [
  { locale: "EN", taskType: "TRANSLATE_EN", languageName: "anglais" },
  { locale: "ES", taskType: "TRANSLATE_ES", languageName: "espagnol" },
];

interface TranslatedArticle {
  title: string;
  summary: string;
  contentHtml: string;
}

function buildSystemPrompt(languageName: string): string {
  return `Tu traduis un article de football déjà publié, du français vers ${languageName === "anglais" ? "l'anglais" : "l'espagnol"}.

Règles strictes :
- Traduis fidèlement. N'ajoute, n'invente et ne supprime aucune information par rapport au texte source.
- Conserve les noms propres (joueurs, clubs, compétitions) tels quels, sauf s'ils ont une forme largement établie dans la langue cible.
- Conserve la structure HTML de "contentHtml" telle quelle (mêmes balises, seul le texte à l'intérieur est traduit).
- Réponds STRICTEMENT en JSON valide, sans texte avant ou après, avec ce format exact :
{"title": "...", "summary": "...", "contentHtml": "..."}`;
}

function buildPrompt(article: { title: string; summary: string | null; contentHtml: string }): string {
  return `Titre : ${article.title}\n\nRésumé : ${article.summary ?? ""}\n\nContenu (HTML) :\n${article.contentHtml}`;
}

async function translateOne(
  article: { id: string; title: string; summary: string | null; contentHtml: string },
  locale: ArticleLocale,
  languageName: string,
): Promise<TranslatedArticle | null> {
  const provider = createAiProvider();

  let raw: string;
  try {
    raw = await provider.generateText({
      system: buildSystemPrompt(languageName),
      prompt: buildPrompt(article),
      maxTokens: 1400,
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      logger.warn({ articleId: article.id, locale, error: error.message }, "Traduction : échec IA, article ignoré");
      return null;
    }
    throw error;
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.warn({ articleId: article.id, locale }, "Traduction : réponse IA sans JSON exploitable, article ignoré");
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<TranslatedArticle>;
    if (!parsed.title || !parsed.contentHtml) {
      logger.warn({ articleId: article.id, locale }, "Traduction : JSON incomplet, article ignoré");
      return null;
    }
    return { title: parsed.title, summary: parsed.summary ?? "", contentHtml: parsed.contentHtml };
  } catch (cause) {
    logger.warn({ articleId: article.id, locale, cause }, "Traduction : JSON invalide, article ignoré");
    return null;
  }
}

/**
 * Traduit en EN/ES les NewsArticle déjà PUBLISHED (jamais un DRAFT — même
 * philosophie de revue humaine que le reste de l'agent éditorial : on ne
 * traduit que du contenu déjà validé par Hicham). Une ArticleTranslation
 * générée reste elle-même en DRAFT tant qu'elle n'a pas été publiée depuis
 * /admin/news — la traduction automatique fait gagner du temps de rédaction,
 * pas de relecture. Chaque tentative passe par AgentTask (voir agentTask.ts)
 * pour ne jamais retraduire un article déjà fait, et pour que l'agent de
 * supervision voie les échecs par article+langue.
 */
export async function translateArticles(): Promise<void> {
  if (!hasAiProviderConfigured()) {
    logger.info("Traduction : aucun fournisseur IA configuré, run ignoré");
    return;
  }

  let translated = 0;

  for (const { locale, taskType, languageName } of LOCALES) {
    const alreadyTranslated = await prisma.articleTranslation.findMany({
      where: { locale },
      select: { articleId: true },
    });
    const alreadyTranslatedIds = new Set(alreadyTranslated.map((t) => t.articleId));
    const alreadyDone = await entityIdsWithDoneTask("NEWS_ARTICLE", taskType);

    const articles = await prisma.newsArticle.findMany({
      where: { status: "PUBLISHED", id: { notIn: [...alreadyTranslatedIds, ...alreadyDone] } },
      orderBy: { publishedAt: "desc" },
      take: MAX_ARTICLES_PER_RUN,
      select: { id: true, title: true, summary: true, contentHtml: true },
    });

    for (const article of articles) {
      const ok = await runAgentTask({
        entityType: "NEWS_ARTICLE",
        entityId: article.id,
        taskType,
        fn: async () => {
          const result = await translateOne(article, locale, languageName);
          if (!result) throw new Error("traduction IA inexploitable");

          await prisma.articleTranslation.upsert({
            where: { articleId_locale: { articleId: article.id, locale } },
            create: { articleId: article.id, locale, ...result },
            update: result,
          });
        },
      });

      if (ok) {
        translated += 1;
        logger.info({ articleId: article.id, locale }, "Traduction : article traduit");
      }
    }
  }

  logger.info({ translated }, "Traduction : run terminé");
}
