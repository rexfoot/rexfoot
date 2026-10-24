import { prisma } from "@rexfoot/db";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class AssetUploadError extends Error {}

/** Stocke une image uploadée depuis le panel admin (bytea Postgres) et renvoie son URL publique. */
export async function storeImageAsset(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new AssetUploadError("Le fichier doit être une image (JPG, PNG, WebP…).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new AssetUploadError("L'image dépasse la taille maximale de 8 Mo.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await prisma.asset.create({
    data: { mimeType: file.type, filename: file.name, byteSize: buffer.byteLength, data: buffer },
  });
  return `/api/assets/${asset.id}`;
}

/** Best-effort : supprime l'Asset référencé par une coverImageUrl (ex. avant de la remplacer). */
export async function deleteAssetFromUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const match = url.match(/^\/api\/assets\/([a-z0-9]+)$/i);
  if (!match) return;
  await prisma.asset.delete({ where: { id: match[1]! } }).catch(() => {});
}

// Seuls les sites de Hicham : une URL libre ferait télécharger au serveur
// n'importe quelle adresse, y compris le réseau interne Railway.
const IMPORT_IMAGE_HOSTS = ["souss-actualites.com", "www.souss-actualites.com"];

/** Reprend la photo d'un article de Souss Actualités comme image de couverture. */
export async function storeImageAssetFromUrl(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AssetUploadError("Adresse d'image invalide.");
  }
  if (url.protocol !== "https:" || !IMPORT_IMAGE_HOSTS.includes(url.hostname)) {
    throw new AssetUploadError("Image acceptée seulement depuis souss-actualites.com.");
  }
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new AssetUploadError(`Image introuvable (HTTP ${res.status}).`);
  const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const blob = await res.blob();
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "image");
  return storeImageAsset(new File([blob], filename, { type }));
}
