import { cookies } from "next/headers";
import { prisma } from "@rexfoot/db";
import { SESSION_COOKIE_NAME, getSessionUserId } from "./session";

export interface CurrentAdmin {
  id: string;
  email: string;
  displayName: string;
}

/** À utiliser dans les Server Components (layout/page) protégés — lit le cookie via `next/headers`. */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return resolveAdmin(token);
}

/** À utiliser dans les Route Handlers `/api/admin/*` — lit le cookie via l'objet `Request`. */
export async function getCurrentAdminFromRequest(request: Request): Promise<CurrentAdmin | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return resolveAdmin(token);
}

async function resolveAdmin(token: string): Promise<CurrentAdmin | null> {
  const userId = await getSessionUserId(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return null;

  return { id: user.id, email: user.email, displayName: user.displayName };
}
