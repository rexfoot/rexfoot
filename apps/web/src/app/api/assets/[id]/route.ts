import { prisma } from "@rexfoot/db";

/**
 * Sert les images uploadées depuis le panel admin (stockées en base, voir
 * lib/data/assets.ts). Un id ne change jamais de contenu — remplacer une image
 * crée un nouvel Asset — donc le cache immuable est sûr.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
