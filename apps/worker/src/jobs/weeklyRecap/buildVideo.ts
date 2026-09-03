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

const MUSIC_VOLUME = 0.25;
const FADE_OUT_SECONDS = 2;
// libx264 pioche par défaut un thread par cœur détecté — sur le conteneur
// Railway du worker, ça a fait planter l'encodage à mi-chemin (code de sortie
// null = tué par un signal, contention CPU/mémoire). Un thread count fixe et
// modeste passe partout, y compris sur un plan compute limité.
const FFMPEG_THREADS = "2";

/**
 * Assemble une liste d'images PNG (une par slide, même durée chacune) en un
 * mp4 H.264 — avec piste audio de fond si `music` est fourni (voir music.ts ;
 * volume réduit + fondu de sortie pour rester discret derrière les scores),
 * sinon vidéo muette (musique indisponible ou non fournie n'est jamais
 * bloquant, voir fetchBackgroundMusic).
 */
export async function buildSlideshowVideo(slides: Buffer[], music: Buffer | null = null): Promise<Buffer> {
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

    const totalSeconds = slides.length * SECONDS_PER_SLIDE;
    const outputPath = path.join(dir, "output.mp4");

    if (music) {
      const musicPath = path.join(dir, "music.mp3");
      await writeFile(musicPath, music);
      const fadeStart = Math.max(0, totalSeconds - FADE_OUT_SECONDS);
      await runFfmpeg([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        // Le morceau Bensound (plusieurs minutes) est toujours plus long qu'un
        // résumé hebdo (quelques dizaines de secondes) — pas besoin de boucler.
        // `-stream_loop -1` (boucle infinie côté ffmpeg, coupée par -shortest)
        // testé ici a fait grimper la mémoire du process jusqu'à l'OOM kill sur
        // le conteneur Railway contraint du worker ; `-t` borne l'audio décodé
        // à la durée utile dès l'entrée, sans jamais décoder plus que ça.
        "-t",
        String(totalSeconds),
        "-i",
        musicPath,
        "-vf",
        "fps=30,format=yuv420p",
        "-af",
        `volume=${MUSIC_VOLUME},afade=t=out:st=${fadeStart}:d=${FADE_OUT_SECONDS}`,
        "-c:v",
        "libx264",
        "-threads",
        FFMPEG_THREADS,
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    } else {
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
        "-threads",
        FFMPEG_THREADS,
        "-movflags",
        "+faststart",
        outputPath,
      ]);
    }

    const { readFile } = await import("node:fs/promises");
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch((cause) =>
      logger.warn({ cause, dir }, "Résumé hebdo : échec nettoyage du dossier temporaire"),
    );
  }
}
