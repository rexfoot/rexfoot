import { NextResponse } from "next/server";
import { z } from "zod";
import { getLiveAudioStatus, setLiveAudioStatus } from "@/lib/data/live-audio";
import { requirePermission, apiError } from "@/lib/api-response";

export async function GET(request: Request) {
  const { admin, response } = await requirePermission(request, "manageLiveAudio");
  if (!admin) return response;

  const isLive = await getLiveAudioStatus();
  return NextResponse.json({ isLive }, { headers: { "Cache-Control": "no-store" } });
}

const bodySchema = z.object({ isLive: z.boolean() });

export async function POST(request: Request) {
  const { admin, response } = await requirePermission(request, "manageLiveAudio");
  if (!admin) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Requête invalide.");

  const isLive = await setLiveAudioStatus(parsed.data.isLive);
  return NextResponse.json({ isLive });
}
