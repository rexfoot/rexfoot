import { cookies } from "next/headers";
import { prisma } from "@rexfoot/db";
import { PUBLIC_SESSION_COOKIE_NAME, getSessionUserId } from "./session";

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  publicProfile: boolean;
}

/** À utiliser dans les Server Components (layout/page) — compte public, distinct de getCurrentAdmin(). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(PUBLIC_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return resolveUser(token);
}

/** À utiliser dans les Route Handlers `/api/*` — lit le cookie via l'objet `Request`. */
export async function getCurrentUserFromRequest(request: Request): Promise<CurrentUser | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${PUBLIC_SESSION_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return resolveUser(token);
}

async function resolveUser(token: string): Promise<CurrentUser | null> {
  const userId = await getSessionUserId(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    publicProfile: user.publicProfile,
  };
}
