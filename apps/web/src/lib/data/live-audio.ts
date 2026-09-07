import { prisma } from "@rexfoot/db";

const SINGLETON_ID = "singleton";

/** true si le commentaire audio en direct doit s'afficher sur les pages match — bascule manuelle admin (pas de détection API YouTube pour l'instant). */
export async function getLiveAudioStatus(): Promise<boolean> {
  const row = await prisma.liveAudioStream.findUnique({ where: { id: SINGLETON_ID } });
  return row?.isLive ?? false;
}

export async function setLiveAudioStatus(isLive: boolean): Promise<boolean> {
  const row = await prisma.liveAudioStream.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, isLive },
    update: { isLive },
  });
  return row.isLive;
}
