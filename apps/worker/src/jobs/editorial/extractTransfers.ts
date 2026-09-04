import { prisma, type TransferStatus } from "@rexfoot/db";
import { createAiProvider, AiProviderError, hasAiProviderConfigured } from "@rexfoot/ai-provider";
import { logger } from "../../lib/logger.js";

const MAX_ARTICLES_PER_RUN = 10;

const TRANSFER_STATUSES = ["OFFICIEL", "AVANCE", "EN_DISCUSSION", "RUMEUR"] as const;

interface ExtractedTransfer {
  playerName: string;
  fromClubName: string | null;
  toClubName: string | null;
  status: TransferStatus;
  feeMillionEur: number | null;
  isFree: boolean;
  notes: string;
}

const SYSTEM_PROMPT = `Tu analyses un article mercato déjà publié pour en extraire, si possible, UN SEUL transfert concret et clairement identifié (un joueur qui rejoint, ou est en passe de rejoindre, un club).

Règles strictes :
- N'extrais QUE ce qui est explicitement écrit dans l'article. N'invente jamais un club, un montant, un statut ou un détail qui n'y figure pas.
- Si l'article ne décrit aucun transfert concret et unique (ex: bilan général du mercato, absence de recrue, plusieurs transferts différents sans un principal, simple rumeur sans joueur ni club identifiés), réponds exactement : {"transfer": null}
- Sinon réponds STRICTEMENT en JSON valide, sans texte avant ni après, avec ce format exact :
{"transfer": {"playerName": "...", "fromClubName": "..." ou null, "toClubName": "..." ou null, "status": "OFFICIEL|AVANCE|EN_DISCUSSION|RUMEUR", "feeMillionEur": nombre ou null, "isFree": true ou false, "notes": "une phrase résumant le transfert"}}
Choix du statut : OFFICIEL si le transfert est confirmé/signé/officialisé ; AVANCE si un accord est trouvé ou imminent ; EN_DISCUSSION si des négociations sont en cours ; RUMEUR sinon.`;

function buildPrompt(article: { title: string; contentHtml: string }): string {
  const plainText = article.contentHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `Titre : ${article.title}\n\nContenu :\n${plainText}`;
}

function isValidStatus(value: unknown): value is TransferStatus {
  return typeof value === "string" && (TRANSFER_STATUSES as readonly string[]).includes(value);
}

/**
 * Sourcé UNIQUEMENT depuis des articles mercato déjà publiés (donc déjà
 * relus/approuvés par un humain via /admin/news) — jamais depuis les flux RSS
 * bruts directement, pour ne jamais créer une fiche transfert à partir d'une
 * information qui n'a pas déjà été validée éditorialement une première fois.
 *
 * Ne publie JAMAIS : chaque fiche créée reste `publishedAt: null` — la
 * publication reste un geste humain volontaire dans /admin/transfers, comme
 * pour l'agent éditorial (voir runEditorialDigest.ts).
 */
export async function extractTransfersFromArticles(): Promise<void> {
  if (!hasAiProviderConfigured()) {
    logger.info("Extraction mercato : aucun fournisseur IA configuré, run ignoré");
    return;
  }

  const existingSourceUrls = new Set(
    (await prisma.transfer.findMany({ select: { sourceUrl: true } }))
      .map((t) => t.sourceUrl)
      .filter((url): url is string => !!url),
  );

  const articles = await prisma.newsArticle.findMany({
    where: { category: "TRANSFERTS", status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: MAX_ARTICLES_PER_RUN,
    select: {
      id: true,
      title: true,
      contentHtml: true,
      sources: { select: { url: true, publisherName: true }, take: 1 },
    },
  });

  const provider = createAiProvider();
  let created = 0;

  for (const article of articles) {
    const source = article.sources[0];
    const sourceUrl = source?.url ?? null;
    if (sourceUrl && existingSourceUrls.has(sourceUrl)) continue;

    let raw: string;
    try {
      raw = await provider.generateText({ system: SYSTEM_PROMPT, prompt: buildPrompt(article), maxTokens: 400 });
    } catch (error) {
      if (error instanceof AiProviderError) {
        logger.warn({ articleId: article.id, error: error.message }, "Extraction mercato : échec IA, article ignoré");
        continue;
      }
      throw error;
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) continue;

    let parsed: { transfer: Partial<ExtractedTransfer> | null };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      logger.warn({ articleId: article.id }, "Extraction mercato : JSON invalide, article ignoré");
      continue;
    }

    const t = parsed.transfer;
    if (!t || !t.playerName || !isValidStatus(t.status)) continue;

    await prisma.transfer.create({
      data: {
        playerName: t.playerName,
        fromClubName: t.fromClubName ?? null,
        toClubName: t.toClubName ?? null,
        status: t.status,
        feeMillionEur: typeof t.feeMillionEur === "number" ? t.feeMillionEur : null,
        isFree: !!t.isFree,
        notes: t.notes ?? null,
        sourceName: source?.publisherName ?? null,
        sourceUrl,
        publishedAt: null,
      },
    });
    created += 1;
    logger.info({ player: t.playerName, articleId: article.id }, "Extraction mercato : fiche transfert créée");
  }

  logger.info({ articlesConsidered: articles.length, created }, "Extraction mercato : run terminé");
}
