import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-response";
import { markAllNotificationsRead } from "@/lib/data/notifications";

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (!user) return response;

  await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}
