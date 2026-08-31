import { NextResponse } from "next/server";
import { getPublishedNews } from "@/lib/data/news";
import { enforceRateLimit } from "@/lib/api-response";

export async function GET(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:news");
  if (rateLimitResponse) return rateLimitResponse;

  const articles = await getPublishedNews();
  return NextResponse.json({ articles });
}
