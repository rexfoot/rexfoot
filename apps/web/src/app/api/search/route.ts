import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { enforceRateLimit } from "@/lib/api-response";

const RESULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

const emptyResults = { articles: [], videos: [], teams: [], players: [], competitions: [] };

/** Recherche instantanée (section 22 du plan) — un aller-retour DB par type de contenu, tous en parallèle. */
export async function GET(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:search");
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) return NextResponse.json(emptyResults);

  const [articles, videos, teams, players, competitions] = await Promise.all([
    prisma.newsArticle.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { author: { displayName: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, slug: true, title: true, coverImageUrl: true },
      take: RESULT_LIMIT,
    }),
    prisma.video.findMany({
      where: {
        moderationStatus: "APPROVED",
        publishedAt: { not: null },
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, slug: true, title: true, thumbnailUrl: true },
      take: RESULT_LIMIT,
    }),
    prisma.team.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, slug: true, name: true, crestUrl: true },
      take: RESULT_LIMIT,
    }),
    prisma.player.findMany({
      where: { displayName: { contains: q, mode: "insensitive" } },
      select: { id: true, slug: true, displayName: true, photoUrl: true },
      take: RESULT_LIMIT,
    }),
    prisma.competition.findMany({
      where: { name: { contains: q, mode: "insensitive" }, isActive: true },
      select: { id: true, slug: true, name: true, logoUrl: true },
      take: RESULT_LIMIT,
    }),
  ]);

  return NextResponse.json({ articles, videos, teams, players, competitions });
}
