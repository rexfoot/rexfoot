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

function PlayerAvatar({ player }: { player: LineupPlayer }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-rf-bg-elevated shadow sm:h-11 sm:w-11">
          {player.photoUrl ? (
            <Image src={player.photoUrl} alt={player.name} width={44} height={44} className="h-full w-full object-cover" unoptimized />
          ) : (
            <User size={20} className="text-rf-fg-subtle" strokeWidth={1.5} />
          )}
        </div>
        {player.number !== null && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rf-gold text-[9px] font-bold text-rf-bg">
            {player.number}
          </span>
        )}
      </div>
      <span className="max-w-[64px] truncate text-center text-[10px] font-medium text-white drop-shadow-sm sm:max-w-[80px] sm:text-xs">
        {player.name}
      </span>
    </div>
  );
}

function PlayerRow({ players }: { players: LineupPlayer[] }) {
  if (players.length === 0) return null;
  return (
    <div className="flex items-start justify-around px-2">
      {players.map((player, i) => (
        <PlayerAvatar key={`${player.name}-${i}`} player={player} />
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
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-green-800 via-green-700 to-green-800 sm:aspect-[4/5]">
      {/* Lignes du terrain, purement décoratives */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute inset-2 rounded-sm border border-white/60" />
        <div className="absolute left-1/2 right-0 top-1/2 h-px -translate-x-1/2 -translate-y-1/2 bg-white/60" style={{ width: "calc(100% - 1rem)" }} />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60" />
        <div className="absolute left-1/2 top-2 h-14 w-28 -translate-x-1/2 border border-t-0 border-white/60" />
        <div className="absolute bottom-2 left-1/2 h-14 w-28 -translate-x-1/2 border border-b-0 border-white/60" />
      </div>

      <div className="relative flex h-1/2 flex-col justify-around py-3">
        {awayRows.map((row, i) => (
          <PlayerRow key={i} players={row} />
        ))}
      </div>
      <div className="relative flex h-1/2 flex-col-reverse justify-around py-3">
        {homeRows.map((row, i) => (
          <PlayerRow key={i} players={row} />
        ))}
      </div>
    </div>
  );
}

function SubstituteRow({ player }: { player: LineupPlayer }) {
  return (
    <li className="flex items-center gap-2 text-sm text-rf-fg">
      <span className="w-6 shrink-0 text-end font-display text-xs font-semibold text-rf-fg-subtle">
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

export function SubstitutesList({ lineup }: { lineup: LineupSummary }) {
  const t = useTranslations("matches");
  if (lineup.substitutes.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rf-fg-subtle">{t("substitutes")}</p>
      <ul className={cn("space-y-1.5")}>
        {lineup.substitutes.map((player, i) => (
          <SubstituteRow key={`${lineup.teamId}-sub-${i}`} player={player} />
        ))}
      </ul>
    </div>
  );
}
