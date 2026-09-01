import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { enforceRateLimit, apiError } from "@/lib/api-response";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, ADMIN_SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/permissions";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:admin-login");
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Email et mot de passe requis.");

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  const invalidCredentials = () => apiError(401, "Email ou mot de passe incorrect.");

  if (!user || !user.passwordHash || !isAdminRole(user.role) || user.status !== "ACTIVE") {
    return invalidCredentials();
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return invalidCredentials();

  const token = await createSession(user.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
