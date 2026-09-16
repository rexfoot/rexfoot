import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";
import { publishToFacebook } from "@/lib/social/facebook";

const bodySchema = z.object({ action: z.enum(["approve", "reject"]) });

/**
 * PATCH /api/admin/news/[id]/breaking-decision — la seule action que le
 * classifieur automatique (voir apps/worker/.../classifySeverity.ts) ne peut
 * jamais faire lui-même : publier. "approve" fait exactement ce qu'un admin
 * ferait à la main (publier + démarrer le chrono de 8h de la barre urgente),
 * en un clic au lieu d'ouvrir le formulaire complet — c'est la rapidité
 * d'approbation qui doit se compter en secondes, jamais la publication
 * elle-même qui saute une étape humaine.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageNews");
  if (!admin) return response;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Action invalide.");

  const article = await prisma.newsArticle.findUnique({ where: { id } });
  if (!article) return apiError(404, "Introuvable.");
  if (!article.isBreaking || article.breakingSince) {
    return apiError(400, "Cet article n'est pas un candidat breaking en attente.");
  }

  if (parsed.data.action === "reject") {
    await prisma.newsArticle.update({ where: { id }, data: { isBreaking: false } });
    return NextResponse.json({ ok: true, action: "reject" });
  }

  const updated = await prisma.newsArticle.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: article.publishedAt ?? new Date(), breakingSince: new Date() },
  });

  await publishToFacebook({ title: updated.title, slug: updated.slug, summary: updated.summary }).catch(() => {
    // Best-effort, même politique que la publication normale — jamais bloquant.
  });

  return NextResponse.json({ ok: true, action: "approve" });
}
