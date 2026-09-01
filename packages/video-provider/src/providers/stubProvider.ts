import {
  VideoProviderError,
  type DirectUploadRequest,
  type DirectUploadResult,
  type VideoDetails,
  type VideoProvider,
} from "../VideoProvider";

/**
 * Provider par défaut en v1 : aucun backend de stockage/transcoding réel n'est
 * branché. Permet de construire et tester le schéma DB et les pages /video
 * dès maintenant. Toute opération refuse explicitement plutôt que de
 * prétendre réussir — l'UI d'upload doit gérer cette erreur et afficher
 * clairement qu'aucun fournisseur vidéo n'est encore configuré.
 */
export class StubVideoProvider implements VideoProvider {
  async createDirectUploadUrl(_input: DirectUploadRequest): Promise<DirectUploadResult> {
    throw new VideoProviderError(
      "Aucun fournisseur vidéo réel n'est configuré (VIDEO_PROVIDER=stub). " +
        "Renseigne CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_STREAM_API_TOKEN puis VIDEO_PROVIDER=cloudflare-stream.",
    );
  }

  async getDetails(_providerAssetId: string): Promise<VideoDetails> {
    return { status: "PROCESSING", playbackUrl: null, thumbnailUrl: null, durationSeconds: null };
  }

  async delete(_providerAssetId: string): Promise<void> {
    // Rien à faire côté stockage — pas de backend réel en v1.
  }
}
