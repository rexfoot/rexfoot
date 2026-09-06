import Image from "next/image";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { LineupPlayer, LineupSummary } from "@/lib/types";

/** "4-2-3-1" -> [4, 2, 3, 1]. Vide (formation inconnue/mal formée) si non exploitable. */
function parseFormation(formation: string | null): number[] {
  if (!formation) return [];
  const rows = formation.split("-").map(Number);
  return rows.every((n) => Number.isInteger(n) && n > 0) ? rows : [];
}

/**
 * Découpe les 11 titulaires en lignes tactiques (gardien puis chaque ligne de
 * la formation, ex. "4-2-3-1" -> [1, 4, 2, 3, 1]) à partir de l'ordre plat
 * renvoyé par Highlightly, qui préserve l'ordre gardien -> défense -> milieu
 * -> attaque (voir flattenLineup dans syncMatchEvents.ts). Si la formation
 * est absente/incohérente avec l'effectif (mi-temps avec expulsion, etc.),
 * renvoie tout sur une seule ligne plutôt qu'un pitch à moitié vide ou cassé.
 */
function splitIntoRows(startingXI: LineupPlayer[], formation: string | null): LineupPlayer[][] {
  if (startingXI.length === 0) return [];
  const [goalkeeper, ...outfield] = startingXI;
  const rowSizes = parseFormation(formation);
  const totalOutfield = rowSizes.reduce((sum, n) => sum + n, 0);

  if (rowSizes.length === 0 || totalOutfield !== outfield.length) {
    return [[goalkeeper], outfield];
  }

  const rows: LineupPlayer[][] = [[goalkeeper]];
  let index = 0;
  for (const size of rowSizes) {
    rows.push(outfield.slice(index, index + size));
    index += size;
  }
  return rows;
}

type Side = "home" | "away";

// Numéro de dos coloré par équipe plutôt qu'une seule couleur pour les deux
// (demandé par Hicham le 2026-09-05 : "differenciar el equipo a y el equipo
// b con numeros de otros colores... y no el verde porque el campo es verde")
// — jamais vert, ce qui exclut `rf-gold` : malgré son nom, ce token vaut
// #00e676 (vert vif, voir globals.css) depuis une refonte de marque, pas un
// vrai doré. On utilise donc directement un ambre Tailwind pour l'équipe
// extérieure, sans dépendre de ce token.
const NUMBER_BADGE_CLASS: Record<Side, string> = {
  home: "bg-blue-500 text-white",
  away: "bg-amber-500 text-rf-bg",
};

function PlayerAvatar({ player, side }: { player: LineupPlayer; side: Side }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-rf-bg-elevated shadow-lg sm:h-16 sm:w-16">
          {player.photoUrl ? (
            <Image src={player.photoUrl} alt={player.name} width={64} height={64} className="h-full w-full object-cover" unoptimized />
          ) : (
            <User size={26} className="text-rf-fg-subtle" strokeWidth={1.5} />
          )}
        </div>
        {player.number !== null && (
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold sm:h-6 sm:w-6 sm:text-xs",
              NUMBER_BADGE_CLASS[side],
            )}
          >
            {player.number}
          </span>
        )}
      </div>
      <span className="max-w-[76px] truncate text-center text-xs font-medium text-white drop-shadow-sm sm:max-w-[96px] sm:text-sm">
        {player.name}
      </span>
    </div>
  );
}

function PlayerRow({ players, side }: { players: LineupPlayer[]; side: Side }) {
  if (players.length === 0) return null;
  return (
    <div className="flex items-start justify-around px-2">
      {players.map((player, i) => (
        <PlayerAvatar key={`${player.name}-${i}`} player={player} side={side} />
      ))}
    </div>
  );
}

/** Pitch partagé, style Sofascore : équipe extérieure en haut (gardien tout en haut), équipe domicile en bas (gardien tout en bas), les deux attaques se faisant face à la ligne médiane. */
export function FormationPitch({ home, away }: { home: LineupSummary; away: LineupSummary }) {
  const homeRows = splitIntoRows(home.startingXI, home.formation);
  const awayRows = splitIntoRows(away.startingXI, away.formation);

  if (homeRows.length === 0 && awayRows.length === 0) return null;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-green-800 via-green-700 to-green-800 shadow-xl sm:aspect-[5/6]">
      {/* Bandes de tonte, purement décoratives */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("absolute inset-x-0 h-1/6", i % 2 === 0 ? "bg-white/[0.04]" : "")} style={{ top: `${i * (100 / 6)}%` }} />
        ))}
      </div>
      {/* Lignes du terrain, purement décoratives */}
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-2 rounded-sm border-2 border-white/70" />
        <div className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/70" style={{ width: "calc(100% - 1rem)" }} />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
        <div className="absolute left-1/2 top-2 h-16 w-32 -translate-x-1/2 border-2 border-t-0 border-white/70" />
        <div className="absolute bottom-2 left-1/2 h-16 w-32 -translate-x-1/2 border-2 border-b-0 border-white/70" />
      </div>

      <div className="relative flex h-1/2 flex-col justify-around py-4">
        {awayRows.map((row, i) => (
          <PlayerRow key={i} players={row} side="away" />
        ))}
      </div>
      <div className="relative flex h-1/2 flex-col-reverse justify-around py-4">
        {homeRows.map((row, i) => (
          <PlayerRow key={i} players={row} side="home" />
        ))}
      </div>
    </div>
  );
}

function SubstituteRow({ player, side }: { player: LineupPlayer; side: Side }) {
  return (
    <li className="flex items-center gap-2 text-sm text-rf-fg">
      <span
        className={cn(
          "flex h-5 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
          NUMBER_BADGE_CLASS[side],
        )}
      >
        {player.number ?? "-"}
      </span>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rf-bg-elevated">
        {player.photoUrl ? (
          <Image src={player.photoUrl} alt={player.name} width={24} height={24} className="h-full w-full object-cover" unoptimized />
        ) : (
          <User size={14} className="text-rf-fg-subtle" strokeWidth={1.5} />
        )}
      </div>
      <span className="truncate">{player.name}</span>
      {player.position && <span className="ms-auto text-xs text-rf-fg-subtle">{player.position}</span>}
    </li>
  );
}

export function SubstitutesList({ lineup, side }: { lineup: LineupSummary; side: Side }) {
  const t = useTranslations("matches");
  if (lineup.substitutes.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rf-fg-subtle">{t("substitutes")}</p>
      <ul className={cn("space-y-1.5")}>
        {lineup.substitutes.map((player, i) => (
          <SubstituteRow key={`${lineup.teamId}-sub-${i}`} player={player} side={side} />
        ))}
      </ul>
    </div>
  );
}
