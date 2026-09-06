import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { requireUser } from "@/lib/api-response";
import { destroySession, PUBLIC_SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Supprime le compte de l'utilisateur connecté et toutes les donnees qui lui
 * sont directement liees. La plupart des relations (favoris, notifications,
 * likes/favoris/commentaires video) sont en cascade au niveau du schema, mais
 * deux cas doivent etre traites a la main avant le DELETE :
 * - VideoReport.reportedById est obligatoire (pas de cascade possible sans
 *   perdre le report), on supprime donc les signalements deposes par ce compte ;
 * - NewsArticle/Transfer.authorId est optionnel : on le detache plutot que de
 *   risquer une erreur de contrainte si ce compte a un jour publie du contenu.
 */
export async function DELETE(request: Request) {
  const { user, response } = await requireUser(request);
  if (!user) return response;

  await prisma.$transaction([
    prisma.videoReport.deleteMany({ where: { reportedById: user.id } }),
    prisma.videoReport.updateMany({ where: { reviewedById: user.id }, data: { reviewedById: null } }),
    prisma.newsArticle.updateMany({ where: { authorId: user.id }, data: { authorId: null } }),
    prisma.transfer.updateMany({ where: { authorId: user.id }, data: { authorId: null } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${PUBLIC_SESSION_COOKIE_NAME}=([^;]+)`));
  if (match?.[1]) await destroySession(match[1]);

  const result = NextResponse.json({ ok: true });
  result.cookies.delete(PUBLIC_SESSION_COOKIE_NAME);
  return result;
}
