import { getEnv } from "@rexfoot/config";
import { logger } from "./logger.js";

/**
 * Notifications WhatsApp aux rédacteurs (début/fin de match, buts), demandé
 * par Hicham le 2026-09-05. Via CallMeBot (https://www.callmebot.com/) :
 * gratuit, usage personnel, pas de vérification "business" — mais chaque
 * destinataire doit d'abord :
 *   1. Ajouter +34 684 72 39 62 à ses contacts WhatsApp.
 *   2. Lui envoyer "I allow callmebot to send me messages".
 *   3. Récupérer l'apikey personnelle renvoyée par le bot.
 * Ensuite, ajouter {name, phone, apikey} dans WHATSAPP_WRITER_NOTIFY_TARGETS
 * (JSON, variable Railway) — phone au format international SANS le "+"
 * (ex. "212612345678"), comme attendu par l'API CallMeBot elle-même.
 *
 * Solution non-officielle, gratuite : pas de garantie de service (Meta peut
 * la limiter/bloquer sans préavis). Si ça devient peu fiable ou qu'il faut
 * notifier beaucoup plus de monde, il faudra passer à l'API officielle
 * WhatsApp Business (Meta Cloud API / Twilio), payante et bien plus lourde à
 * mettre en place (vérification business, templates de message approuvés).
 */
interface WriterNotifyTarget {
  name: string;
  phone: string;
  apikey: string;
}

let cachedTargets: WriterNotifyTarget[] | undefined;

function getTargets(): WriterNotifyTarget[] {
  if (cachedTargets) return cachedTargets;

  const raw = getEnv().WHATSAPP_WRITER_NOTIFY_TARGETS.trim();
  if (!raw) {
    cachedTargets = [];
    return cachedTargets;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("attendu un tableau JSON");
    cachedTargets = parsed.filter(
      (t): t is WriterNotifyTarget =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as WriterNotifyTarget).phone === "string" &&
        typeof (t as WriterNotifyTarget).apikey === "string",
    );
  } catch (cause) {
    logger.error({ cause }, "WHATSAPP_WRITER_NOTIFY_TARGETS invalide (JSON mal formé) — notifications désactivées");
    cachedTargets = [];
  }
  return cachedTargets;
}

/**
 * Best-effort, jamais bloquant : un échec d'envoi (rédacteur pas encore
 * opt-in chez CallMeBot, clé expirée, service indisponible...) est loggé et
 * ignoré — ne doit jamais faire échouer le job de synchro qui l'appelle.
 */
export async function notifyWriters(message: string): Promise<void> {
  const targets = getTargets();
  if (targets.length === 0) return;

  await Promise.allSettled(
    targets.map(async (target) => {
      const url = new URL("https://api.callmebot.com/whatsapp.php");
      url.searchParams.set("phone", target.phone);
      url.searchParams.set("text", message);
      url.searchParams.set("apikey", target.apikey);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          logger.warn(
            { target: target.name, status: response.status },
            "Échec de notification WhatsApp à un rédacteur",
          );
        }
      } catch (cause) {
        logger.warn({ target: target.name, cause }, "Échec réseau de notification WhatsApp à un rédacteur");
      }
    }),
  );
}
