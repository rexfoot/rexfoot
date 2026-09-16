import type { BreakingPriority } from "@rexfoot/db";
import type { TopicCandidate } from "./identifyTopics.js";

/**
 * Classification par mots-clés + nombre de sources indépendantes — jamais de
 * "relevance d'entité" (joueur/club "important") pour l'instant : ça
 * demanderait une métrique de notoriété qui n'existe pas dans RexFoot (pas de
 * classement de popularité joueur/club), et l'inventer serait arbitraire.
 * Le vrai filet de sécurité contre les faux positifs reste l'approbation
 * humaine obligatoire (voir runEditorialDigest.ts) — jamais de publication
 * automatique, ce classifieur ne fait que déclencher une notification et une
 * file d'approbation rapide, jamais isBreaking + publication directe.
 *
 * URGENT (décès, hospitalisation) exige plus de sources que HIGH (transfert
 * officiel, licenciement) : plus l'enjeu réputationnel est grand, plus la
 * corroboration exigée avant même de notifier est stricte — cf. la demande
 * explicite de Hicham de préférer 2 minutes de retard à un faux rumeur de décès.
 */
const MIN_SOURCES_URGENT = 3;
const MIN_SOURCES_HIGH = 2;

// Mots-clés multilingues (FR/ES/EN) — les flux RSS agrégés couvrent les trois
// langues (L'Équipe, Marca/AS, BBC/ESPN). Volontairement des radicaux courts
// (ex. "meurt" plutôt que "meurent"/"mourir") pour absorber les variations de
// conjugaison sans construire un vrai NLP — un faux positif occasionnel est
// sans risque puisqu'il finit simplement dans la file d'approbation humaine.
const URGENT_KEYWORDS = [
  // Décès
  "meurt", "décès", "décédé", "mort subite",
  "muere", "fallece", "fallecido", "fallecimiento",
  "dies", "dead at", "death of", "passed away",
  // Hospitalisation / état de santé grave
  "hospitalisé", "hospitalisée",
  "hospitalizado", "hospitalizada", "grave lesión", "lesión grave",
  "hospitalised", "hospitalized", "critical condition",
];

const HIGH_KEYWORDS = [
  // Transfert officiel de dernière minute
  "transfert officiel", "officialisé",
  "fichaje oficial", "oficialmente confirmado",
  "official signing", "confirmed transfer",
  // Licenciement d'entraîneur
  "limogé", "licencié",
  "despedido", "destituido", "cesado",
  "sacked", "coach fired", "manager fired",
  // Incident grave en direct (carton rouge = catégorie la plus bruyante,
  // volontairement en HIGH et non URGENT — un carton rouge est courant en
  // football, ne justifie pas la même urgence qu'un décès)
  "carton rouge", "expulsé",
  "roja directa", "expulsado",
  "red card", "sent off",
];

function containsKeyword(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

/** Nombre de médias distincts (pas juste d'items) — deux entrées du même flux ne comptent qu'une fois. */
function distinctSourceCount(topic: TopicCandidate): number {
  return new Set(topic.items.map((item) => item.publisherName)).size;
}

/**
 * Renvoie la sévérité si le sujet doit devenir un CANDIDAT breaking (jamais
 * publié automatiquement) — null sinon, auquel cas le sujet suit le chemin
 * éditorial normal (DRAFT sans isBreaking). Le titre de chaque item de la
 * source est vérifié : un seul média utilisant le mot-clé suffit à qualifier
 * le sujet, mais le nombre de médias DISTINCTS doit atteindre le seuil pour
 * que le sujet devienne effectivement un candidat.
 */
export function classifyBreakingSeverity(topic: TopicCandidate): BreakingPriority | null {
  const titles = topic.items.map((item) => item.title);
  const sourceCount = distinctSourceCount(topic);

  const isUrgent = titles.some((title) => containsKeyword(title, URGENT_KEYWORDS));
  if (isUrgent && sourceCount >= MIN_SOURCES_URGENT) return "URGENT";

  const isHigh = titles.some((title) => containsKeyword(title, HIGH_KEYWORDS));
  if (isHigh && sourceCount >= MIN_SOURCES_HIGH) return "HIGH";

  return null;
}
