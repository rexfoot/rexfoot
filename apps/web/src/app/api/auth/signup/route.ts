import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { enforceRateLimit, apiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { createSession, PUBLIC_SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth/session";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  displayName: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
});

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:signup");
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return apiError(409, "Cet email est déjà utilisé.");

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      displayName,
      role: "USER",
      status: "ACTIVE",
    },
  });

  const token = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PUBLIC_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
