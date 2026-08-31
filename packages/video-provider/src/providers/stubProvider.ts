import {
  VideoProviderError,
  type TranscodeStatus,
  type VideoProvider,
  type VideoUploadInput,
  type VideoUploadResult,
} from "../VideoProvider";

/**
 * Provider par défaut en v1 : aucun backend de stockage/transcoding réel n'est
 * branché. Permet de construire et tester le schéma DB, les pages /video et
 * la liste des vidéos dès maintenant. `upload()` refuse explicitement plutôt
 * que de prétendre réussir — l'UI d'upload doit gérer cette erreur et
 * afficher clairement qu'aucun fournisseur vidéo n'est encore configuré.
 */
export class StubVideoProvider implements VideoProvider {
  async upload(_input: VideoUploadInput): Promise<VideoUploadResult> {
    throw new VideoProviderError(
      "Aucun fournisseur vidéo réel n'est configuré (VIDEO_PROVIDER=stub). " +
        "Choisis et branche un fournisseur (ex. Cloudflare Stream) avant d'activer l'upload.",
    );
  }

  async getPlaybackUrl(_providerAssetId: string): Promise<string | null> {
    return null;
  }

  async getThumbnailUrl(_providerAssetId: string): Promise<string | null> {
    return null;
  }

  async getTranscodeStatus(_providerAssetId: string): Promise<TranscodeStatus> {
    return "PROCESSING";
  }

  async delete(_providerAssetId: string): Promise<void> {
    // Rien à faire côté stockage — pas de backend réel en v1.
  }
}
