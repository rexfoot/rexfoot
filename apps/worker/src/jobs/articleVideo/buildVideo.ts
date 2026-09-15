import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { logger } from "../../lib/logger.js";

const CROSSFADE_DURATION_S = 0.8;
const MUSIC_VOLUME = 0.2;
const FADE_OUT_SECONDS = 3;
const FFMPEG_THREADS = "2";
const DEFAULT_SLIDE_DURATION_S = 4;

if (!ffmpegPath) {
  throw new Error("ffmpeg-static n'a pas résolu de binaire ffmpeg pour cette plateforme.");
}
const FFMPEG_PATH: string = ffmpegPath;

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args);
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg a quitté avec le code ${code}\n${stderr.slice(-3000)}`));
    });
  });
}

/**
 * Assemble une série de slides PNG en un MP4 avec transitions crossfade
 * et musique de fond. Chaque slide a une durée différente :
 * - Titre : TITLE_DURATION_S
 * - Contenu : DEFAULT_SLIDE_DURATION_S chacune
 * - Outro : OUTRO_DURATION_S
 */
export async function buildArticleVideo(
  slides: Buffer[],
  durations: number[],
  music: Buffer | null = null,
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "rexfoot-article-"));
  try {
    // Write all slides as PNG files
    for (const [i, slide] of slides.entries()) {
      const filename = `slide-${String(i).padStart(3, "0")}.png`;
      await writeFile(path.join(dir, filename), slide);
    }

    const outputPath = path.join(dir, "output.mp4");
    const n = slides.length;

    if (n === 0) {
      throw new Error("Aucune slide à assembler");
    }

    if (n === 1) {
      // Single slide: simple concat
      const listPath = path.join(dir, "list.txt");
      const filename = "slide-000.png";
      const duration = durations[0] ?? DEFAULT_SLIDE_DURATION_S;
      await writeFile(listPath, `file '${filename}'\nduration ${duration}\nfile '${filename}'`);

      const args = [
        "-y", "-f", "concat", "-safe", "0", "-i", listPath,
        "-vf", "fps=30,format=yuv420p",
        "-c:v", "libx264", "-threads", FFMPEG_THREADS,
        "-movflags", "+faststart", outputPath,
      ];
      if (music) {
        const musicPath = path.join(dir, "music.mp3");
        await writeFile(musicPath, music);
        const totalDuration = duration;
        const fadeStart = Math.max(0, totalDuration - FADE_OUT_SECONDS);
        args.splice(args.length - 1, 0,
          "-t", String(totalDuration), "-i", musicPath,
          "-af", `volume=${MUSIC_VOLUME},afade=t=out:st=${fadeStart}:d=${FADE_OUT_SECONDS}`,
          "-c:a", "aac", "-shortest",
        );
      }
      await runFfmpeg(args);
    } else {
      // Multiple slides: use xfade filter for crossfade transitions
      await buildWithCrossfade(dir, n, durations, music, outputPath);
    }

    const { readFile } = await import("node:fs/promises");
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch((cause) =>
      logger.warn({ cause, dir }, "Article vidéo : échec nettoyage dossier temporaire"),
    );
  }
}

async function buildWithCrossfade(
  dir: string,
  n: number,
  durations: number[],
  music: Buffer | null,
  outputPath: string,
): Promise<void> {
  // Build input args and xfade filter chain
  const inputArgs: string[] = [];
  for (let i = 0; i < n; i++) {
    const filename = `slide-${String(i).padStart(3, "0")}.png`;
    inputArgs.push("-loop", "1", "-t", String(durations[i] ?? DEFAULT_SLIDE_DURATION_S), "-i", path.join(dir, filename));
  }

  // Build xfade filter chain
  // Each xfade takes two inputs and produces one output
  // The offset for each xfade is the cumulative duration minus crossfade duration
  const filterParts: string[] = [];
  let cumulativeDuration = durations[0] ?? DEFAULT_SLIDE_DURATION_S;

  if (n === 2) {
    // Simple case: one crossfade between two slides
    const offset = cumulativeDuration - CROSSFADE_DURATION_S;
    filterParts.push(`[0:v][1:v]xfade=transition=fade:duration=${CROSSFADE_DURATION_S}:offset=${offset}[outv]`);
  } else {
    // Chain xfade filters
    let prevLabel = "0:v";
    for (let i = 1; i < n; i++) {
      const offset = cumulativeDuration - CROSSFADE_DURATION_S;
      const outLabel = i === n - 1 ? "outv" : `v${i}`;
      filterParts.push(
        `[${prevLabel}][${i}:v]xfade=transition=fade:duration=${CROSSFADE_DURATION_S}:offset=${offset.toFixed(2)}[${outLabel}]`,
      );
      prevLabel = outLabel;
      cumulativeDuration += (durations[i] ?? DEFAULT_SLIDE_DURATION_S) - CROSSFADE_DURATION_S;
    }
  }

  const filterComplex = filterParts.join(";");

  const args = [
    "-y",
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-vf", "fps=30,format=yuv420p",
    "-c:v", "libx264",
    "-threads", FFMPEG_THREADS,
    "-movflags", "+faststart",
  ];

  const totalDuration = durations.reduce((sum, d) => sum + d, 0) - (n - 1) * CROSSFADE_DURATION_S;

  if (music) {
    const musicPath = path.join(dir, "music.mp3");
    await writeFile(musicPath, music);
    const fadeStart = Math.max(0, totalDuration - FADE_OUT_SECONDS);
    args.push(
      "-t", String(totalDuration),
      "-i", musicPath,
      "-af", `volume=${MUSIC_VOLUME},afade=t=out:st=${fadeStart.toFixed(2)}:d=${FADE_OUT_SECONDS}`,
      "-c:a", "aac",
      "-shortest",
    );
  }

  args.push(outputPath);

  await runFfmpeg(args);
}
