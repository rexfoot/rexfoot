import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { logger } from "../../lib/logger.js";

const SECONDS_PER_SLIDE = 4;

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
      else reject(new Error(`ffmpeg a quitté avec le code ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

/**
 * Assemble une liste d'images PNG (une par slide, même durée chacune) en un
 * mp4 H.264 muet — pas de piste audio : voir generateWeeklyRecap.ts pour
 * pourquoi (aucune source musicale libre de droits vérifiée n'est câblée ici,
 * mieux vaut une vidéo silencieuse qu'un risque de copyright).
 */
export async function buildSlideshowVideo(slides: Buffer[]): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "rexfoot-recap-"));
  try {
    const listLines: string[] = [];
    for (const [i, slide] of slides.entries()) {
      const filename = `slide-${String(i).padStart(3, "0")}.png`;
      await writeFile(path.join(dir, filename), slide);
      listLines.push(`file '${filename}'`, `duration ${SECONDS_PER_SLIDE}`);
    }
    // Le concat demuxer ffmpeg ignore la `duration` de la dernière entrée
    // (limitation documentée) — on répète la dernière ligne `file` pour que
    // le dernier slide s'affiche bien SECONDS_PER_SLIDE secondes lui aussi.
    const lastFile = `slide-${String(slides.length - 1).padStart(3, "0")}.png`;
    listLines.push(`file '${lastFile}'`);

    const listPath = path.join(dir, "list.txt");
    await writeFile(listPath, listLines.join("\n"));

    const outputPath = path.join(dir, "output.mp4");
    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-vf",
      "fps=30,format=yuv420p",
      "-c:v",
      "libx264",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const { readFile } = await import("node:fs/promises");
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch((cause) =>
      logger.warn({ cause, dir }, "Résumé hebdo : échec nettoyage du dossier temporaire"),
    );
  }
}
