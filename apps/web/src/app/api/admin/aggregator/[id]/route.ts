import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";

const bodySchema = z.object({ status: z.enum(["PUBLISHED", "REJECTED", "DRAFT"]) });

/**
 * PATCH /api/admin/aggregator/[id] — bascule le statut d'une AggregatedHeadline
 * (revue humaine manuelle, voir aggregateHeadlines.ts et schema.prisma).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageAggregator");
  if (!admin) return response;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Statut invalide.");

  const existing = await prisma.aggregatedHeadline.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Introuvable.");

  await prisma.aggregatedHeadline.update({ where: { id }, data: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
