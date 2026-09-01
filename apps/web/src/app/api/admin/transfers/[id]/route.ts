import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type TransferStatus } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";
import { TRANSFER_STATUS_VALUES } from "@/lib/transfer-status";

const bodySchema = z.object({
  playerName: z.string().trim().min(2, "Le nom du joueur est requis."),
  fromClubName: z.string().trim().optional(),
  toClubName: z.string().trim().optional(),
  status: z.enum(TRANSFER_STATUS_VALUES as [string, ...string[]]),
  feeMillionEur: z.coerce.number().positive().optional(),
  isFree: z.boolean().default(false),
  transferDate: z.string().optional(),
  sourceName: z.string().trim().optional(),
  sourceUrl: z.string().trim().url().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  published: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageTransfers");
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.transfer.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Transfert introuvable.");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const data = parsed.data;

  await prisma.transfer.update({
    where: { id },
    data: {
      playerName: data.playerName,
      fromClubName: data.fromClubName || null,
      toClubName: data.toClubName || null,
      status: data.status as TransferStatus,
      feeMillionEur: data.isFree ? null : (data.feeMillionEur ?? null),
      isFree: data.isFree,
      transferDate: data.transferDate ? new Date(data.transferDate) : null,
      sourceName: data.sourceName || null,
      sourceUrl: data.sourceUrl || null,
      notes: data.notes || null,
      publishedAt: data.published ? (existing.publishedAt ?? new Date()) : null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageTransfers");
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.transfer.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Transfert introuvable.");

  await prisma.transfer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
