import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { enforceRateLimit } from "@/lib/api-response";

/** Compteur simple (section 27 du plan), best-effort, jamais bloquant pour le clic réel du recruteur. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const rateLimitResponse = await enforceRateLimit(request, "api:talents-contact-click");
  if (rateLimitResponse) return rateLimitResponse;

  const { slug } = await params;
  await prisma.talentProfile
    .updateMany({ where: { slug, status: "APPROVED" }, data: { contactClickCount: { increment: 1 } } })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
