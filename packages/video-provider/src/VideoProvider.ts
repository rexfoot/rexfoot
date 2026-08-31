export type TranscodeStatus = "PROCESSING" | "READY" | "FAILED";

export interface VideoUploadInput {
  /** Flux ou buffer du fichier vidéo source. */
  file: Buffer | ReadableStream;
  filename: string;
  metadata: Record<string, string>;
}

export interface VideoUploadResult {
  providerAssetId: string;
}

/**
 * Contrat unique pour tout fournisseur de stockage/streaming vidéo. Permet de
 * construire dès maintenant le schéma DB, les pages /video et le flux
 * d'upload sans dépendre d'un fournisseur concret — brancher un vrai service
 * (ex. Cloudflare Stream) plus tard = une nouvelle classe + un changement de
 * `VIDEO_PROVIDER`, aucun autre changement dans l'app.
 */
export interface VideoProvider {
  upload(input: VideoUploadInput): Promise<VideoUploadResult>;
  getPlaybackUrl(providerAssetId: string): Promise<string | null>;
  getThumbnailUrl(providerAssetId: string): Promise<string | null>;
  getTranscodeStatus(providerAssetId: string): Promise<TranscodeStatus>;
  delete(providerAssetId: string): Promise<void>;
}

export class VideoProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "VideoProviderError";
  }
}
