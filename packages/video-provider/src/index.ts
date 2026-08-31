import { getEnv } from "@rexfoot/config";
import type { VideoProvider } from "./VideoProvider";
import { StubVideoProvider } from "./providers/stubProvider";

export * from "./VideoProvider";
export { StubVideoProvider } from "./providers/stubProvider";

let cachedProvider: VideoProvider | undefined;

/**
 * Point d'entrée unique pour obtenir le VideoProvider actif, choisi via
 * `VIDEO_PROVIDER`. En v1, seul "stub" existe — "cloudflare-stream" sera
 * ajouté ici (providers/cloudflareStream.ts) une fois un compte choisi.
 */
export function createVideoProvider(): VideoProvider {
  if (cachedProvider) return cachedProvider;

  const env = getEnv();

  switch (env.VIDEO_PROVIDER) {
    case "stub":
      cachedProvider = new StubVideoProvider();
      return cachedProvider;
    case "cloudflare-stream":
      throw new Error(
        "VIDEO_PROVIDER=cloudflare-stream n'est pas encore implémenté. " +
          "Voir packages/video-provider/src/providers pour ajouter cette implémentation.",
      );
    default:
      cachedProvider = new StubVideoProvider();
      return cachedProvider;
  }
}
