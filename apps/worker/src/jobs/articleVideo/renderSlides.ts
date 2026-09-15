import sharp from "sharp";
import { logger } from "../../lib/logger.js";

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

const SLIDE_DURATION_S = 4;
const TITLE_DURATION_S = 5;
const OUTRO_DURATION_S = 2;
export { SLIDE_DURATION_S, TITLE_DURATION_S, OUTRO_DURATION_S };

const BG_DARK = "#0a0b0d";
const BG_LIGHT = "#111318";
const FG = "#f3f4f6";
const FG_MUTED = "#9ca3af";
const ACCENT = "#00e676";
const ORANGE = "#ff7a1a";
const CARD_BG = "rgba(10,11,13,0.85)";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Texte brut → paragraphs pour affichage dans les slides. */
export function htmlToTextParagraphs(html: string): string[] {
  return html
    .split(/<\/p>\s*/)
    .map((chunk) => chunk.replace(/^<p>/, "").trim())
    .filter(Boolean)
    .map((chunk) => chunk.replace(/<br\s*\/?>/g, "\n").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"))
    .join("\n\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Découpe le texte en blocs de ~maxChars caractères, en respectant les
 * boundaries de phrases (point followed by space or end). Si un paragraphe
 * est plus court que maxChars, il reste entier dans un seul bloc.
 */
export function chunkText(paragraphs: string[], maxChars = 280): string[] {
  const chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      chunks.push(para);
      continue;
    }
    // Split on sentence boundaries
    const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
    let current = "";
    for (const sentence of sentences) {
      if (current.length + sentence.length > maxChars && current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) {
      chunks.push(current.trim());
    }
  }
  return chunks;
}

async function fetchImageDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (cause) {
    logger.warn({ url, cause }, "Article vidéo : image introuvable, slide sans image");
    return null;
  }
}

/** Crée une version floutée de l'image pour les fonds de slides de contenu. */
async function fetchBlurredBackgroundDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const blurred = await sharp(buffer)
      .resize(SLIDE_WIDTH, SLIDE_HEIGHT, { fit: "cover" })
      .blur(40)
      .modulate({ brightness: 0.4 })
      .png()
      .toBuffer();
    return `data:image/png;base64,${blurred.toString("base64")}`;
  } catch (cause) {
    logger.warn({ url, cause }, "Article vidéo : échec fond flou, slide sans arrière-plan");
    return null;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  TRANSFERTS: "TRANSFERS",
  RESULTATS: "RESULTS",
  ANALYSES: "ANALYSIS",
  INTERVIEWS: "INTERVIEWS",
  COMPETITIONS: "COMPETITIONS",
  INTERNATIONAL: "INTERNATIONAL",
  PORTRAITS: "PROFILES",
  AUTRE: "NEWS",
};

export interface ArticleSlideInput {
  title: string;
  category: string;
  contentHtml: string;
  coverImageUrl: string | null;
  teamName?: string | null;
  playerName?: string | null;
}

export interface RenderedSlides {
  slides: Buffer[];
  totalDurationSeconds: number;
}

/**
 * Génère toutes les slides d'un article vidéo :
 * 1. Slide titre (5s)
 * 2. Slides contenu (4s chacune)
 * 3. Slide outro (4s)
 */
export async function renderArticleSlides(input: ArticleSlideInput): Promise<RenderedSlides> {
  const paragraphs = htmlToTextParagraphs(input.contentHtml);
  const textChunks = chunkText(paragraphs);

  // Limit to ~12 content slides to stay under 5 min
  const maxContentSlides = 12;
  const chunks = textChunks.slice(0, maxContentSlides);

  // Fetch images in parallel
  const [coverDataUri, bgDataUri] = await Promise.all([
    fetchImageDataUri(input.coverImageUrl),
    fetchBlurredBackgroundDataUri(input.coverImageUrl),
  ]);

  const titleSlideDuration = 5;
  const contentSlideDuration = 4;
  const outroSlideDuration = 4;
  const totalDurationSeconds =
    titleSlideDuration + chunks.length * contentSlideDuration + outroSlideDuration;

  const categoryLabel = CATEGORY_LABELS[input.category] ?? "NEWS";

  const slides: Buffer[] = [];

  // 1. Title slide
  slides.push(await renderTitleSlide(input.title, categoryLabel, coverDataUri, bgDataUri));

  // 2. Content slides
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk) {
      slides.push(
        await renderContentSlide(chunk, i + 1, chunks.length, bgDataUri, coverDataUri),
      );
    }
  }

  // 3. Outro slide
  slides.push(await renderOutroSlide());

  return { slides, totalDurationSeconds };
}

async function renderTitleSlide(
  title: string,
  category: string,
  coverDataUri: string | null,
  bgDataUri: string | null,
): Promise<Buffer> {
  const bgImage = bgDataUri
    ? `<image href="${bgDataUri}" x="0" y="0" width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" preserveAspectRatio="xMidYMid slice" />`
    : "";
  const coverImage = coverDataUri
    ? `<image href="${coverDataUri}" x="${SLIDE_WIDTH - 480}" y="140" width="400" height="400" rx="20" preserveAspectRatio="xMidYMid slice" />`
    : "";

  const titleLines = wrapText(title, 38);
  const titleMarkup = titleLines
    .map(
      (line, i) =>
        `<text x="100" y="${340 + i * 60}" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800" fill="${FG}">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  const svg = `
<svg width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BG_LIGHT}" />
      <stop offset="100%" stop-color="${BG_DARK}" />
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(0,0,0,0.8)" />
      <stop offset="70%" stop-color="rgba(0,0,0,0.3)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0)" />
    </linearGradient>
  </defs>
  ${bgImage}
  <rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="url(#bg)" />
  <rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="url(#overlay)" />
  <rect x="0" y="0" width="${SLIDE_WIDTH}" height="8" fill="${ACCENT}" />

  <text x="100" y="180" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700"
        fill="${ORANGE}" letter-spacing="4">${escapeXml(category)}</text>

  ${titleMarkup}

  <rect x="100" y="${340 + titleLines.length * 60 + 20}" width="120" height="4" rx="2" fill="${ACCENT}" />

  ${coverImage}

  <text x="100" y="${SLIDE_HEIGHT - 60}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700"
        fill="${ACCENT}" letter-spacing="3">REXFOOT.COM</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderContentSlide(
  text: string,
  current: number,
  total: number,
  bgDataUri: string | null,
  coverDataUri: string | null,
): Promise<Buffer> {
  const bgImage = bgDataUri
    ? `<image href="${bgDataUri}" x="0" y="0" width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" preserveAspectRatio="xMidYMid slice" />`
    : "";

  const textLines = wrapText(text, 52);
  const textMarkup = textLines
    .slice(0, 10) // Max 10 lines per slide
    .map(
      (line, i) =>
        `<text x="120" y="${220 + i * 48}" font-family="Arial, Helvetica, sans-serif" font-size="36" fill="${FG}">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  const progressWidth = (current / total) * (SLIDE_WIDTH - 200);

  const svg = `
<svg width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BG_LIGHT}" />
      <stop offset="100%" stop-color="${BG_DARK}" />
    </linearGradient>
  </defs>
  ${bgImage}
  <rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="url(#bg)" opacity="0.7" />
  <rect x="0" y="0" width="${SLIDE_WIDTH}" height="6" fill="${ACCENT}" />

  <rect x="80" y="140" width="${SLIDE_WIDTH - 160}" height="${SLIDE_HEIGHT - 240}" rx="16" fill="${CARD_BG}" />

  ${textMarkup}

  <rect x="100" y="${SLIDE_HEIGHT - 80}" width="${SLIDE_WIDTH - 200}" height="3" rx="1.5" fill="#1e2028" />
  <rect x="100" y="${SLIDE_HEIGHT - 80}" width="${progressWidth}" height="3" rx="1.5" fill="${ACCENT}" />

  <text x="${SLIDE_WIDTH - 100}" y="${SLIDE_HEIGHT - 60}" font-family="Arial, Helvetica, sans-serif" font-size="20"
        fill="${FG_MUTED}" text-anchor="end">${current} / ${total}</text>

  <text x="100" y="${SLIDE_HEIGHT - 60}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700"
        fill="${ACCENT}" letter-spacing="2">REXFOOT.COM</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderOutroSlide(): Promise<Buffer> {
  const svg = `
<svg width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" viewBox="0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BG_LIGHT}" />
      <stop offset="100%" stop-color="${BG_DARK}" />
    </linearGradient>
  </defs>
  <rect width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}" fill="url(#bg)" />
  <rect x="0" y="0" width="${SLIDE_WIDTH}" height="8" fill="${ACCENT}" />

  <text x="${SLIDE_WIDTH / 2}" y="${SLIDE_HEIGHT / 2 - 60}" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="800"
        fill="${FG}" text-anchor="middle">REXFOOT</text>
  <text x="${SLIDE_WIDTH / 2}" y="${SLIDE_HEIGHT / 2 + 20}" font-family="Arial, Helvetica, sans-serif" font-size="28"
        fill="${FG_MUTED}" text-anchor="middle" letter-spacing="6">REXF foot.COM</text>

  <rect x="${SLIDE_WIDTH / 2 - 60}" y="${SLIDE_HEIGHT / 2 + 60}" width="120" height="4" rx="2" fill="${ACCENT}" />

  <text x="${SLIDE_WIDTH / 2}" y="${SLIDE_HEIGHT / 2 + 120}" font-family="Arial, Helvetica, sans-serif" font-size="22"
        fill="${FG_MUTED}" text-anchor="middle">Football news, scores &amp; stats</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Wrap text to max characters per line, breaking at word boundaries. */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
