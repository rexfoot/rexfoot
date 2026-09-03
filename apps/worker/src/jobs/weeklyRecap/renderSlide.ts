import sharp from "sharp";
import { logger } from "../../lib/logger.js";

export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

const BG = "#0a0b0d";
const FG = "#f3f4f6";
const FG_MUTED = "#9ca3af";
const ACCENT = "#00e676";
const ORANGE = "#ff7a1a";

/** Échappe le texte inséré tel quel dans le XML du SVG (noms d'équipe, compétitions). */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Récupère un écusson d'équipe et le renvoie en data URI base64 — un <image
 * href="https://…"> dans un SVG rasterisé par sharp/librsvg ne charge jamais
 * l'URL distante (sandbox), il faut lui donner les octets directement.
 * best-effort : une image manquante/en échec ne bloque jamais un slide, elle
 * est juste omise (voir renderMatchSlide).
 */
async function fetchCrestDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (cause) {
    logger.warn({ url, cause }, "Résumé hebdo : écusson introuvable, slide sans logo");
    return null;
  }
}

function crestMarkup(dataUri: string | null, cx: number, cy: number, size: number): string {
  if (!dataUri) {
    // Pas d'écusson dispo : simple disque neutre plutôt qu'un logo deviné/faux.
    return `<circle cx="${cx}" cy="${cy}" r="${size / 2}" fill="#2a2d33" stroke="${FG_MUTED}" stroke-width="2" />`;
  }
  return `<image href="${dataUri}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" />`;
}

export interface MatchSlideInput {
  competitionName: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
}

export async function renderMatchSlide(match: MatchSlideInput): Promise<Buffer> {
  const [homeCrest, awayCrest] = await Promise.all([
    fetchCrestDataUri(match.homeCrestUrl),
    fetchCrestDataUri(match.awayCrestUrl),
  ]);

  const centerY = SLIDE_HEIGHT / 2 + 20;
  const crestSize = 180;
  const homeX = SLIDE_WIDTH / 2 - 260;
  const awayX = SLIDE_WIDTH / 2 + 260;

  const svg = `
<svg width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111318" />
      <stop offset="100%" stop-color="${BG}" />
    </linearGradient>
  </defs>
  <rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="url(#bg)" />
  <rect x="0" y="0" width="${SLIDE_WIDTH}" height="8" fill="${ACCENT}" />

  <text x="${SLIDE_WIDTH / 2}" y="110" font-family="Arial, sans-serif" font-size="32" font-weight="700"
        fill="${ORANGE}" text-anchor="middle" letter-spacing="2">${escapeXml(match.competitionName.toUpperCase())}</text>

  ${crestMarkup(homeCrest, homeX, centerY - 40, crestSize)}
  ${crestMarkup(awayCrest, awayX, centerY - 40, crestSize)}

  <text x="${SLIDE_WIDTH / 2}" y="${centerY - 20}" font-family="Arial, sans-serif" font-size="96" font-weight="800"
        fill="${FG}" text-anchor="middle">${match.homeScore} - ${match.awayScore}</text>

  <text x="${homeX}" y="${centerY + 190}" font-family="Arial, sans-serif" font-size="34" font-weight="700"
        fill="${FG}" text-anchor="middle">${escapeXml(match.homeName)}</text>
  <text x="${awayX}" y="${centerY + 190}" font-family="Arial, sans-serif" font-size="34" font-weight="700"
        fill="${FG}" text-anchor="middle">${escapeXml(match.awayName)}</text>

  <text x="${SLIDE_WIDTH / 2}" y="${SLIDE_HEIGHT - 40}" font-family="Arial, sans-serif" font-size="26" font-weight="700"
        fill="${ACCENT}" text-anchor="middle" letter-spacing="3">REXFOOT.COM</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderTitleSlide(subtitle: string): Promise<Buffer> {
  const svg = `
<svg width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111318" />
      <stop offset="100%" stop-color="${BG}" />
    </linearGradient>
  </defs>
  <rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="url(#bg)" />
  <rect x="0" y="0" width="${SLIDE_WIDTH}" height="8" fill="${ACCENT}" />

  <text x="${SLIDE_WIDTH / 2}" y="${SLIDE_HEIGHT / 2 - 30}" font-family="Arial, sans-serif" font-size="88" font-weight="800"
        fill="${FG}" text-anchor="middle">REXFOOT</text>
  <text x="${SLIDE_WIDTH / 2}" y="${SLIDE_HEIGHT / 2 + 50}" font-family="Arial, sans-serif" font-size="40" font-weight="700"
        fill="${ORANGE}" text-anchor="middle" letter-spacing="2">RÉSUMÉ DE LA SEMAINE</text>
  <text x="${SLIDE_WIDTH / 2}" y="${SLIDE_HEIGHT / 2 + 110}" font-family="Arial, sans-serif" font-size="28"
        fill="${FG_MUTED}" text-anchor="middle">${escapeXml(subtitle)}</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
