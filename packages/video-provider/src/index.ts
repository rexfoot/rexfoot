import { getEnv } from "@rexfoot/config";
import type { VideoProvider } from "./VideoProvider";
import { StubVideoProvider } from "./providers/stubProvider";
import { CloudflareStreamProvider } from "./providers/cloudflareStreamProvider";

export * from "./VideoProvider";
export { StubVideoProvider } from "./providers/stubProvider";
export { CloudflareStreamProvider } from "./providers/cloudflareStreamProvider";

let cachedProvider: VideoProvider | undefined;

/**
 * Point d'entrée unique pour obtenir le VideoProvider actif, choisi via
 * `VIDEO_PROVIDER`.
 */
export function createVideoProvider(): VideoProvider {
  if (cachedProvider) return cachedProvider;

  const env = getEnv();

  switch (env.VIDEO_PROVIDER) {
    case "cloudflare-stream": {
      if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_STREAM_API_TOKEN) {
        throw new Error(
          "VIDEO_PROVIDER=cloudflare-stream nécessite CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_STREAM_API_TOKEN.",
        );
      }
      cachedProvider = new CloudflareStreamProvider({
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: env.CLOUDFLARE_STREAM_API_TOKEN,
      });
      return cachedProvider;
    }
    case "stub":
    default:
      cachedProvider = new StubVideoProvider();
      return cachedProvider;
  }
}
