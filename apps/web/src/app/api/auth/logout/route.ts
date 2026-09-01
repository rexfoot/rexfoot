import { NextResponse } from "next/server";
import { destroySession, PUBLIC_SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${PUBLIC_SESSION_COOKIE_NAME}=([^;]+)`));
  if (match?.[1]) await destroySession(match[1]);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(PUBLIC_SESSION_COOKIE_NAME);
  return response;
}
