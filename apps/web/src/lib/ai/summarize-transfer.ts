import { createAiProvider } from "@rexfoot/ai-provider";
import type { TransferStatus } from "@rexfoot/db";
import { TRANSFER_STATUS_LABELS } from "@/lib/transfer-status";

interface TransferFacts {
  playerName: string;
  fromClubName?: string;
  toClubName?: string;
  status: TransferStatus;
  feeMillionEur?: number;
  isFree: boolean;
  sourceName?: string;
}

/**
 * Rédige un brouillon pour le champ "notes" du mercato — jamais publié
 * automatiquement : l'admin relit/édite avant d'enregistrer (voir le bouton
 * "Générer avec l'IA" dans TransferForm).
 */
export async function generateTransferNotes(facts: TransferFacts): Promise<string> {
  const provider = createAiProvider();

  const factLines = [
    `Joueur : ${facts.playerName}`,
    `Club actuel : ${facts.fromClubName || "inconnu"}`,
    `Club de destination : ${facts.toClubName || "inconnu"}`,
    `Statut : ${TRANSFER_STATUS_LABELS[facts.status]}`,
    facts.isFree
      ? "Transfert libre (sans indemnité)"
      : facts.feeMillionEur
        ? `Montant : ${facts.feeMillionEur}M€`
        : "Montant : inconnu",
    facts.sourceName ? `Source : ${facts.sourceName}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return provider.generateText({
    system:
      "Tu es un assistant éditorial pour un média sportif francophone spécialisé mercato. Rédige STRICTEMENT à partir des informations fournies, sans ajouter aucun fait, chiffre, club ou détail qui n'y figure pas. N'invente jamais un montant, un club, une date ou un détail marqué comme inconnu — dans ce cas, n'en parle simplement pas. Réponds uniquement avec le texte, sans guillemets ni préambule.",
    prompt: `Informations sur ce transfert :\n${factLines}\n\nRédige une à deux phrases présentant ce transfert pour un article mercato, en français.`,
    maxTokens: 200,
  });
}
