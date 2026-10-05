import webpush from "web-push";
import { prisma } from "./index.js";

const VAPID_PUBLIC_KEY = "vapid:publicKey";
const VAPID_PRIVATE_KEY = "vapid:privateKey";
const VAPID_SUBJECT_KEY = "vapid:subject";

const DEFAULT_SUBJECT = "mailto:footrexofficial@gmail.com";

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/**
 * Clés VAPID Web Push : variables d'environnement d'abord (prioritaire —
 * permet d'imposer des clés à la main), sinon ligne en base générée UNE
 * seule fois ici puis réutilisée par web ET worker. Évite toute manipulation
 * Railway : au premier appel (premier visiteur qui ouvre le bouton
 * d'alerte, ou premier but à notifier), la paire est créée et stockée.
 *
 * Course à la génération (web + worker en même temps) : l'upsert par clé
 * fait que le second écrase — les deux paires sont valides, seule la
 * dernière stockée sert ; aucun abonnement existant n'est invalidé dans la
 * pratique (aucun au premier appel de toute façon).
 */
export async function getOrCreateVapidKeys(): Promise<VapidKeys> {
  const envPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate, subject: process.env.VAPID_SUBJECT?.trim() || DEFAULT_SUBJECT };
  }

  const rows = await prisma.appSetting.findMany({ where: { key: { in: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT_KEY] } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const storedPublic = byKey.get(VAPID_PUBLIC_KEY);
  const storedPrivate = byKey.get(VAPID_PRIVATE_KEY);

  if (storedPublic && storedPrivate) {
    return { publicKey: storedPublic, privateKey: storedPrivate, subject: byKey.get(VAPID_SUBJECT_KEY) || DEFAULT_SUBJECT };
  }

  const generated = webpush.generateVAPIDKeys();
  const subject = process.env.VAPID_SUBJECT?.trim() || DEFAULT_SUBJECT;
  await prisma.$transaction([
    prisma.appSetting.upsert({ where: { key: VAPID_PUBLIC_KEY }, create: { key: VAPID_PUBLIC_KEY, value: generated.publicKey }, update: { value: generated.publicKey } }),
    prisma.appSetting.upsert({ where: { key: VAPID_PRIVATE_KEY }, create: { key: VAPID_PRIVATE_KEY, value: generated.privateKey }, update: { value: generated.privateKey } }),
    prisma.appSetting.upsert({ where: { key: VAPID_SUBJECT_KEY }, create: { key: VAPID_SUBJECT_KEY, value: subject }, update: {} }),
  ]);
  // Relit (si un autre process a généré entre-temps, on prend la sienne).
  const fresh = await prisma.appSetting.findMany({ where: { key: { in: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT_KEY] } } });
  const freshByKey = new Map(fresh.map((r) => [r.key, r.value]));
  return {
    publicKey: freshByKey.get(VAPID_PUBLIC_KEY) ?? generated.publicKey,
    privateKey: freshByKey.get(VAPID_PRIVATE_KEY) ?? generated.privateKey,
    subject: freshByKey.get(VAPID_SUBJECT_KEY) || subject,
  };
}
