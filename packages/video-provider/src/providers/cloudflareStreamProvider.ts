import {
  VideoProviderError,
  type DirectUploadRequest,
  type DirectUploadResult,
  type TranscodeStatus,
  type VideoDetails,
  type VideoProvider,
} from "../VideoProvider";

export interface CloudflareStreamConfig {
  accountId: string;
  apiToken: string;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
}

interface DirectUploadApiResult {
  uploadURL: string;
  uid: string;
}

interface StreamVideoApiResult {
  uid: string;
  thumbnail: string | null;
  duration: number | null;
  status: { state: string };
  playback: { hls: string | null; dash: string | null } | null;
}

const API_BASE = "https://api.cloudflare.com/client/v4";

function mapState(state: string): TranscodeStatus {
  if (state === "ready") return "READY";
  if (state === "error") return "FAILED";
  return "PROCESSING";
}

/**
 * Fournisseur Cloudflare Stream — l'upload passe directement du navigateur de
 * l'admin vers Cloudflare (createDirectUploadUrl génère une URL à usage
 * unique) : le fichier vidéo ne transite jamais par notre serveur Next.js,
 * ce qui évite les limites de taille/temps de requête côté Railway.
 * Doc : https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
 */
export class CloudflareStreamProvider implements VideoProvider {
  constructor(private readonly config: CloudflareStreamConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}/accounts/${this.config.accountId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const body = (await response.json()) as CloudflareApiResponse<T>;
    if (!response.ok || !body.success) {
      const message = body.errors?.map((e) => e.message).join("; ") || `HTTP ${response.status}`;
      throw new VideoProviderError(`Cloudflare Stream a renvoyé une erreur : ${message}`);
    }
    return body.result;
  }

  async createDirectUploadUrl(_input: DirectUploadRequest): Promise<DirectUploadResult> {
    const result = await this.request<DirectUploadApiResult>("/stream/direct_upload", {
      method: "POST",
      body: JSON.stringify({
        maxDurationSeconds: 3600,
        requireSignedURLs: false,
      }),
    });
    return { uploadUrl: result.uploadURL, providerAssetId: result.uid };
  }

  async getDetails(providerAssetId: string): Promise<VideoDetails> {
    const result = await this.request<StreamVideoApiResult>(`/stream/${providerAssetId}`);
    const status = mapState(result.status.state);
    let playbackUrl: string | null = null;
    if (status === "READY") {
      // Extraire le sous-domaine client depuis l'URL HLS renvoyée par l'API
      // pour construire l'URL d'embed correcte (customer-{subdomain}.cloudflarestream.com)
      // au lieu du domaine legacy iframe.videodelivery.net qui ne charge pas correctement.
      const hlsUrl = result.playback?.hls;
      if (hlsUrl) {
        const match = hlsUrl.match(/https:\/\/customer-([^.]+)\.cloudflarestream\.com\//);
        if (match) {
          playbackUrl = `https://customer-${match[1]}.cloudflarestream.com/${providerAssetId}`;
        }
      }
      if (!playbackUrl) {
        playbackUrl = `https://iframe.videodelivery.net/${providerAssetId}`;
      }
    }
    return {
      status,
      playbackUrl,
      thumbnailUrl: result.thumbnail ?? null,
      durationSeconds: result.duration !== null ? Math.round(result.duration) : null,
    };
  }

  async delete(providerAssetId: string): Promise<void> {
    await this.request<null>(`/stream/${providerAssetId}`, { method: "DELETE" });
  }
}
