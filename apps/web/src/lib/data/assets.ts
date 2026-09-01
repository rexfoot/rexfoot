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
