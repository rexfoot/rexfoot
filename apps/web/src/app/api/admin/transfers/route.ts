import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type TransferStatus } from "@rexfoot/db";
import { requireAdmin, apiError } from "@/lib/api-response";
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

export async function POST(request: Request) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const data = parsed.data;

  const transfer = await prisma.transfer.create({
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
      authorId: admin.id,
      publishedAt: data.published ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, id: transfer.id });
}
