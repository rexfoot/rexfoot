import Redis from "ioredis";
import { getEnv } from "@rexfoot/config";

let client: Redis | undefined;

/** Client Redis partagé côté web — utilisé pour le rate limiting des routes API publiques. */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: 2 });
    // ioredis fait planter tout le process Node si un événement "error" n'a
    // aucun listener — un simple log évite qu'un hoquet Redis ponctuel tue
    // le serveur entier au lieu de juste faire échouer la requête en cours.
    client.on("error", (error) => console.error("[redis] erreur de connexion", error));
  }
  return client;
}
