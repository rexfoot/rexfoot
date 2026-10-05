import { NextResponse } from "next/server";
import { getOrCreateVapidKeys } from "@rexfoot/db";

/**
 * Clé publique VAPID pour que le navigateur construise son abonnement push.
 * Variables d'environnement d'abord, sinon paire auto-générée et stockée en
 * base (aucune manipulation Railway requise) — voir
 * packages/db/src/vapid.ts.
 */
export async function GET() {
  try {
    const { publicKey } = await getOrCreateVapidKeys();
    return NextResponse.json({ publicKey });
  } catch {
    return NextResponse.json({ error: "Push non configuré." }, { status: 503 });
  }
}
