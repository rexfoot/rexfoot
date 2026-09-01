import { prisma } from "@rexfoot/db";

/** Notifie tous les comptes publics actifs qu'une alerte "breaking" vient d'être publiée. */
export async function notifyBreakingNews(article: { title: string; slug: string }): Promise<void> {
  const users = await prisma.user.findMany({ where: { role: "USER", status: "ACTIVE" }, select: { id: true } });
  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((user) => ({ userId: user.id, title: article.title, linkUrl: `/news/${article.slug}` })),
  });
}
