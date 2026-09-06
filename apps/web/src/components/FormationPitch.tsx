import Image from "next/image";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { LineupPlayer, LineupSummary, MatchEventSummary } from "@/lib/types";

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * "Sergio Herrera" -> "S. Herrera" pour tenir sur le pitch sans coupure au
 * milieu d'un mot (le `truncate` CSS précédent donnait des noms tronqués
 * illisibles type "Íñigo Arguib..." — pas professionnel). Laisse intact un
 * nom déjà abrégé par la source (ex. "F. Boyomo").
 */
function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1 || parts[0].endsWith(".")) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

/**
 * Compare deux noms de joueur en tolérant les formats différents entre
 * l'événement SUBSTITUTION (nom complet) et la liste de remplaçants (parfois
 * déjà abrégée, ex. "Xanet Oláiz Ibarzábal" vs "X. Olaiz") — un token
 * significatif (>=3 lettres) en commun suffit.
 */
function namesLikelyMatch(a: string, b: string): boolean {
  const tokens = (s: string) =>
    stripDiacritics(s.toLowerCase())
      .replace(/\./g, "")
      .split(/\s+/)
      .filter((t) => t.length >= 3);
  const ta = tokens(a);
  const tb = tokens(b);
  return ta.some((t) => tb.includes(t));
}

/**
 * Retire du banc les joueurs déjà sortis en cours de match : Highlightly les
 * laisse dans `substitutes` après leur remplacement au lieu de les enlever,
 * ce qui donnait une liste "remplaçants" gonflée et trompeuse (des joueurs
 * qui ne peuvent plus entrer, mélangés aux vrais remplaçants disponibles).
 */
export function filterActiveSubstitutes(lineup: LineupSummary, events: MatchEventSummary[]): LineupSummary {
  const outNames = events
    .filter((e): e is MatchEventSummary & { detailOut: string } => e.type === "SUBSTITUTION" && e.teamId === lineup.teamId && !!e.detailOut)
    .map((e) => e.detailOut);
  if (outNames.length === 0) return lineup;
  return { ...lineup, substitutes: lineup.substitutes.filter((p) => !outNames.some((out) => namesLikelyMatch(out, p.name))) };
}

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

// Lignes de 5 joueurs (défenses à trois/back-five) : avatar réduit d'un cran
// pour ne jamais déborder sur les téléphones étroits (~360px de large).
type AvatarSize = "normal" | "compact";

const AVATAR_SIZE_CLASS: Record<AvatarSize, string> = {
  normal: "h-16 w-16 sm:h-24 sm:w-24",
  compact: "h-12 w-12 sm:h-16 sm:w-16",
};
const BADGE_SIZE_CLASS: Record<AvatarSize, string> = {
  normal: "h-6 w-6 text-xs sm:h-8 sm:w-8 sm:text-sm",
  compact: "h-5 w-5 text-[11px] sm:h-6 sm:w-6 sm:text-xs",
};
const NAME_SIZE_CLASS: Record<AvatarSize, string> = {
  normal: "max-w-[80px] text-xs sm:max-w-[130px] sm:text-sm",
  compact: "max-w-[62px] text-[11px] sm:max-w-[96px] sm:text-xs",
};
const ICON_SIZE: Record<AvatarSize, [number, number]> = {
  normal: [32, 44],
  compact: [22, 30],
};

function PlayerAvatar({ player, side, size }: { player: LineupPlayer; side: Side; size: AvatarSize }) {
  const [iconSm, iconLg] = ICON_SIZE[size];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <div className={cn("flex items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-rf-bg-elevated shadow-lg", AVATAR_SIZE_CLASS[size])}>
          {player.photoUrl ? (
            <Image src={player.photoUrl} alt={player.name} width={96} height={96} className="h-full w-full object-cover" unoptimized />
          ) : (
            <>
              <User size={iconSm} className="text-rf-fg-subtle sm:hidden" strokeWidth={1.5} />
              <User size={iconLg} className="hidden text-rf-fg-subtle sm:block" strokeWidth={1.5} />
            </>
          )}
        </div>
        {player.number !== null && (
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full font-bold",
              BADGE_SIZE_CLASS[size],
              NUMBER_BADGE_CLASS[side],
            )}
          >
            {player.number}
          </span>
        )}
      </div>
      <span className={cn("truncate text-center font-semibold text-white drop-shadow-sm", NAME_SIZE_CLASS[size])}>{shortName(player.name)}</span>
    </div>
  );
}

function PlayerRow({ players, side }: { players: LineupPlayer[]; side: Side }) {
  if (players.length === 0) return null;
  const size: AvatarSize = players.length >= 5 ? "compact" : "normal";
  return (
    <div className="flex items-start justify-around px-1">
      {players.map((player, i) => (
        <PlayerAvatar key={`${player.name}-${i}`} player={player} side={side} size={size} />
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
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-green-800 via-green-700 to-green-800 shadow-2xl ring-1 ring-white/10">
      {/* Bandes de tonte, purement décoratives */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("absolute inset-x-0 h-1/6", i % 2 === 0 ? "bg-white/[0.04]" : "")} style={{ top: `${i * (100 / 6)}%` }} />
        ))}
      </div>
      {/* Lignes du terrain, purement décoratives */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-2 rounded-sm border-2 border-white/70" />
        <div className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/70" style={{ width: "calc(100% - 1rem)" }} />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
        <div className="absolute left-1/2 top-2 h-16 w-32 -translate-x-1/2 border-2 border-t-0 border-white/70" />
        <div className="absolute bottom-2 left-1/2 h-16 w-32 -translate-x-1/2 border-2 border-b-0 border-white/70" />
      </div>
      {/* Vignette de stade, purement décorative */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      <div className="relative flex h-1/2 flex-col justify-around py-3 sm:py-5">
        {awayRows.map((row, i) => (
          <PlayerRow key={i} players={row} side="away" />
        ))}
      </div>
      <div className="relative flex h-1/2 flex-col-reverse justify-around py-3 sm:py-5">
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
