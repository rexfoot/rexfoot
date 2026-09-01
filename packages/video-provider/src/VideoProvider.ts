export type TranscodeStatus = "PROCESSING" | "READY" | "FAILED";

export interface DirectUploadRequest {
  /** Nom de fichier d'origine, transmis au fournisseur pour ses métadonnées internes. */
  filename: string;
}

export interface DirectUploadResult {
  /** URL vers laquelle le navigateur envoie le fichier directement (jamais via notre serveur). */
  uploadUrl: string;
  /** Identifiant de l'asset chez le fournisseur, à stocker dans Video.providerAssetId. */
  providerAssetId: string;
}

export interface VideoDetails {
  status: TranscodeStatus;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

/**
 * Contrat unique pour tout fournisseur de stockage/streaming vidéo. Le flux
 * retenu est l'upload direct navigateur → fournisseur (createDirectUploadUrl) :
 * notre serveur ne reçoit jamais l'octet vidéo lui-même, seulement le
 * résultat final (providerAssetId) une fois l'upload terminé côté client.
 */
export interface VideoProvider {
  createDirectUploadUrl(input: DirectUploadRequest): Promise<DirectUploadResult>;
  getDetails(providerAssetId: string): Promise<VideoDetails>;
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
