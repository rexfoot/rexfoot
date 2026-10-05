import { NextResponse } from "next/server";

/** Clé publique VAPID pour que le navigateur construise son abonnement push. 404 si non configuré. */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "Push non configuré." }, { status: 404 });
  return NextResponse.json({ publicKey: key });
}
