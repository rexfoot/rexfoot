import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-response";
import { getUserNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";

export async function GET(request: Request) {
  const { user, response } = await requireUser(request);
  if (!user) return response;

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
