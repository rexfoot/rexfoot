import { NextResponse } from "next/server";
import { z } from "zod";
import type { TransferStatus } from "@rexfoot/db";
import { AiProviderError } from "@rexfoot/ai-provider";
import { requirePermission, apiError } from "@/lib/api-response";
import { generateTransferNotes } from "@/lib/ai/summarize-transfer";
import { TRANSFER_STATUS_VALUES } from "@/lib/transfer-status";

const bodySchema = z.object({
  playerName: z.string().trim().min(2, "Le nom du joueur est requis."),
  fromClubName: z.string().trim().optional(),
  toClubName: z.string().trim().optional(),
  status: z.enum(TRANSFER_STATUS_VALUES as [string, ...string[]]),
  feeMillionEur: z.coerce.number().positive().optional(),
  isFree: z.boolean().default(false),
  sourceName: z.string().trim().optional(),
});

/** Brouillon de texte IA pour le champ "notes" du mercato — jamais enregistré directement, l'admin doit relire et sauvegarder. */
export async function POST(request: Request) {
  const { admin, response } = await requirePermission(request, "manageTransfers");
  if (!admin) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message ?? "Requête invalide.");

  try {
    const notes = await generateTransferNotes({
      ...parsed.data,
      status: parsed.data.status as TransferStatus,
    });
    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof AiProviderError) return apiError(502, error.message);
    throw error;
  }
}
