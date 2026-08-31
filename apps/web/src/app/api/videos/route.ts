import { NextResponse } from "next/server";
import { getPublishedVideos } from "@/lib/data/videos";
import { enforceRateLimit } from "@/lib/api-response";

export async function GET(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:videos");
  if (rateLimitResponse) return rateLimitResponse;

  const videos = await getPublishedVideos();
  return NextResponse.json({ videos });
}
