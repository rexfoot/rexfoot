import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Goal } from "lucide-react";
import { cn } from "@/lib/cn";
import { TeamCrest } from "./TeamCrest";
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
 * "Gabriel Suazo" -> "GS". Beaucoup de joueurs n'ont pas de photo résolue
 * (TheSportsDB limité en quota, voir mémoire projet) — un mur de silhouettes
 * grises identiques rend le pitch illisible et donne une impression d'app
 * cassée. Des initiales colorées par équipe, comme un avatar Slack/Gmail,
 * restent lisibles et distinctes même sans photo.
 */
function initials(fullName: string): string {
  const parts = fullName.trim().replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Compare deux noms de joueur en tolérant les formats différents entre
 * l'événement SUBSTITUTION (nom complet) et la liste de remplaçants (parfois
 * déjà abrégée, ex. "Xanet Oláiz Ibarzábal" vs "X. Olaiz") : même initiale de
 * prénom, et un nom de famille en commun (n'importe quel token après le
 * premier, pour gérer les doubles noms de famille espagnols type "Manuel
 * Bueno Sebastián" vs "Manu Bueno").
 *
 * Exclut délibérément le tout premier token de la comparaison des noms à
 * plusieurs mots : les prénoms composés très courants en espagnol ("Miguel
 * Ángel", "José Ángel"...) donnaient sinon de faux positifs entre joueurs
 * différents ne partageant qu'un prénom — vérifié sur un match réel (RCD
 * Espanyol–Sevilla, 2026-09-07) où "Miguel Sierra" et "José Ángel Carmona"
 * matchaient à tort le joueur "Miguel Ángel".
 */
function namesLikelyMatch(a: string, b: string): boolean {
  const tokens = (s: string) =>
    stripDiacritics(s.toLowerCase())
      .replace(/\./g, "")
      .split(/\s+/)
      .filter(Boolean);
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  // Mononyme (ex. "Isaac") : doit apparaître tel quel dans l'autre nom.
  if (ta.length === 1) return tb.includes(ta[0]);
  if (tb.length === 1) return ta.includes(tb[0]);
  if (ta[0][0] !== tb[0][0]) return false;
  const tailA = ta.slice(1).filter((t) => t.length >= 3);
  const tailB = tb.slice(1).filter((t) => t.length >= 3);
  return tailA.some((t) => tailB.includes(t));
}

/**
 * Retire du banc les joueurs déjà entrés PUIS ressortis en cours de match
 * (double changement) : Highlightly les laisse dans `substitutes` au lieu de
 * les enlever, ce qui donnait une liste "remplaçants" gonflée et trompeuse
 * (des joueurs qui ne peuvent plus entrer, mélangés aux vrais remplaçants
 * disponibles).
 *
 * Important — sémantique des champs SUBSTITUTION vérifiée sur un match réel
 * (RCD Espanyol–Sevilla, 2026-09-07) en croisant chaque event avec les
 * titulaires/remplaçants : `detail` est le joueur qui SORT (déjà sur le
 * terrain), `detailOut` celui qui ENTRE (venait du banc) — l'inverse de ce
 * que suggère le nom des champs. Voir aussi getPlayerEvents ci-dessous, qui
 * s'appuie sur la même lecture.
 */
export function filterActiveSubstitutes(lineup: LineupSummary, events: MatchEventSummary[]): LineupSummary {
  const teamSubs = events.filter((e) => e.type === "SUBSTITUTION" && e.teamId === lineup.teamId);
  const enteredNames = teamSubs.filter((e): e is MatchEventSummary & { detailOut: string } => !!e.detailOut).map((e) => e.detailOut);
  const leftNames = teamSubs.filter((e): e is MatchEventSummary & { detail: string } => !!e.detail).map((e) => e.detail);
  const usedUpNames = enteredNames.filter((entered) => leftNames.some((left) => namesLikelyMatch(left, entered)));
  if (usedUpNames.length === 0) return lineup;
  return { ...lineup, substitutes: lineup.substitutes.filter((p) => !usedUpNames.some((name) => namesLikelyMatch(name, p.name))) };
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

/**
 * Étiquette d'une ligne tactique à partir de son index (gardien -> défense ->
 * milieu(x) -> attaque, voir splitIntoRows). Réutilise les traductions déjà
 * existantes de l'espace de noms "players" plutôt que d'en dupliquer de
 * nouvelles. `null` quand la formation n'est pas exploitable (repli à 2
 * lignes de splitIntoRows) : impossible d'étiqueter correctement un bloc
 * "tout le monde sauf le gardien".
 */
function rowLabelKey(index: number, totalRows: number): "goalkeeper" | "defender" | "midfielder" | "forward" | null {
  if (totalRows <= 2) return null;
  if (index === 0) return "goalkeeper";
  if (index === totalRows - 1) return "forward";
  if (index === 1) return "defender";
  return "midfielder";
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

// Sur le pitch même (contrairement au banc ci-dessous), le numéro n'est plus
// un badge rond superposé à la photo mais un simple chiffre coloré devant le
// nom (convention Google : "23 Omar El Hilali") — plus propre, sans rien
// cacher du visage du joueur.
const NUMBER_TEXT_CLASS: Record<Side, string> = {
  home: "text-blue-400",
  away: "text-amber-400",
};

const AVATAR_FALLBACK_CLASS: Record<Side, string> = {
  home: "bg-gradient-to-br from-blue-600/50 to-blue-950/60 text-blue-50",
  away: "bg-gradient-to-br from-amber-500/50 to-amber-900/60 text-amber-50",
};

// Lignes de 5 joueurs (défenses à trois/back-five) : avatar réduit d'un cran
// pour ne jamais déborder sur les téléphones étroits (~360px de large).
type AvatarSize = "normal" | "compact";

const AVATAR_SIZE_CLASS: Record<AvatarSize, string> = {
  normal: "h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24",
  compact: "h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16",
};
// Largeur de colonne fixe (>= largeur de l'avatar) : garantit un rythme
// régulier entre joueurs d'une même ligne et empêche deux noms voisins de se
// chevaucher, quelle que soit la longueur du nom une fois abrégé.
const AVATAR_COLUMN_CLASS: Record<AvatarSize, string> = {
  normal: "w-[76px] sm:w-[100px] lg:w-[120px]",
  compact: "w-[58px] sm:w-[78px] lg:w-[92px]",
};
const NAME_SIZE_CLASS: Record<AvatarSize, string> = {
  normal: "max-w-[76px] text-xs sm:max-w-[100px] sm:text-sm lg:max-w-[120px]",
  compact: "max-w-[58px] text-[10px] sm:max-w-[78px] sm:text-xs lg:max-w-[92px]",
};
const INITIALS_TEXT_CLASS: Record<AvatarSize, string> = {
  normal: "text-lg sm:text-2xl",
  compact: "text-sm sm:text-lg",
};

function formatEventMinute(minute: number, extraMinute: number | null): string {
  return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`;
}

/** Événements résolus pour un joueur donné, par correspondance de nom tolérante (voir namesLikelyMatch) — un joueur peut cumuler plusieurs buts. */
interface PlayerEventBadges {
  goals: number;
  ownGoals: number;
  yellowCards: number;
  redCard: boolean;
  subInMinute: string | null;
  subOutMinute: string | null;
}

/** Pour SUBSTITUTION, `detail` = joueur qui SORT et `detailOut` = joueur qui ENTRE — voir filterActiveSubstitutes ci-dessus pour la vérification. */
function getPlayerEvents(playerName: string, events: MatchEventSummary[]): PlayerEventBadges {
  const badges: PlayerEventBadges = { goals: 0, ownGoals: 0, yellowCards: 0, redCard: false, subInMinute: null, subOutMinute: null };
  for (const e of events) {
    if ((e.type === "GOAL" || e.type === "PENALTY") && e.detail && namesLikelyMatch(e.detail, playerName)) badges.goals += 1;
    else if (e.type === "OWN_GOAL" && e.detail && namesLikelyMatch(e.detail, playerName)) badges.ownGoals += 1;
    else if (e.type === "YELLOW_CARD" && e.detail && namesLikelyMatch(e.detail, playerName)) badges.yellowCards += 1;
    else if (e.type === "RED_CARD" && e.detail && namesLikelyMatch(e.detail, playerName)) badges.redCard = true;
    else if (e.type === "SUBSTITUTION") {
      if (e.detail && namesLikelyMatch(e.detail, playerName)) badges.subOutMinute = formatEventMinute(e.minute, e.extraMinute);
      if (e.detailOut && namesLikelyMatch(e.detailOut, playerName)) badges.subInMinute = formatEventMinute(e.minute, e.extraMinute);
    }
  }
  return badges;
}

/** Icônes but (ballon)/carton jaune/carton rouge/remplacement, sous le nom sur le pitch ou en bout de ligne sur le banc. */
function EventBadges({ badges }: { badges: PlayerEventBadges }) {
  const t = useTranslations("matches");
  const hasAny = badges.goals > 0 || badges.ownGoals > 0 || badges.yellowCards > 0 || badges.redCard || !!badges.subInMinute || !!badges.subOutMinute;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {badges.goals > 0 && (
        <span className="inline-flex items-center gap-0.5" title={t("goal")}>
          <Goal size={11} className="shrink-0 text-rf-gold" aria-hidden />
          {badges.goals > 1 && <span className="text-[9px] font-bold text-rf-gold">×{badges.goals}</span>}
        </span>
      )}
      {badges.ownGoals > 0 && (
        <span className="inline-flex items-center gap-0.5" title={t("ownGoal")}>
          <Goal size={11} className="shrink-0 text-rf-live" aria-hidden />
          {badges.ownGoals > 1 && <span className="text-[9px] font-bold text-rf-live">×{badges.ownGoals}</span>}
        </span>
      )}
      {badges.yellowCards > 0 && <span className="h-2.5 w-2 shrink-0 rounded-[1px] bg-yellow-400" title={t("yellowCard")} aria-hidden />}
      {badges.redCard && <span className="h-2.5 w-2 shrink-0 rounded-[1px] bg-red-600" title={t("redCard")} aria-hidden />}
      {badges.subOutMinute && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-400" title={t("substitution")}>
          <ArrowDown size={10} className="shrink-0" aria-hidden />
          {badges.subOutMinute}
        </span>
      )}
      {badges.subInMinute && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-green-500" title={t("substitution")}>
          <ArrowUp size={10} className="shrink-0" aria-hidden />
          {badges.subInMinute}
        </span>
      )}
    </div>
  );
}

function PlayerAvatar({ player, side, size, events }: { player: LineupPlayer; side: Side; size: AvatarSize; events: MatchEventSummary[] }) {
  const badges = getPlayerEvents(player.name, events);
  return (
    <div className={cn("flex flex-col items-center gap-1", AVATAR_COLUMN_CLASS[size])}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full border-2 shadow-lg",
          badges.redCard ? "border-red-500" : "border-white/90",
          AVATAR_SIZE_CLASS[size],
          player.photoUrl ? "bg-rf-bg-elevated" : AVATAR_FALLBACK_CLASS[side],
        )}
      >
        {player.photoUrl ? (
          <Image src={player.photoUrl} alt={player.name} width={96} height={96} className="h-full w-full object-cover" unoptimized />
        ) : (
          <span className={cn("font-bold tracking-wide", INITIALS_TEXT_CLASS[size])}>{initials(player.name)}</span>
        )}
      </div>
      <span className={cn("block text-center leading-tight drop-shadow-sm", NAME_SIZE_CLASS[size])}>
        {player.number !== null && <span className={cn("font-bold", NUMBER_TEXT_CLASS[side])}>{player.number} </span>}
        <span className="font-semibold text-white">{shortName(player.name)}</span>
      </span>
      <EventBadges badges={badges} />
    </div>
  );
}

function PlayerRow({
  players,
  side,
  rowLabel,
  events,
}: {
  players: LineupPlayer[];
  side: Side;
  rowLabel: string | null;
  events: MatchEventSummary[];
}) {
  if (players.length === 0) return null;
  const size: AvatarSize = players.length >= 5 ? "compact" : "normal";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
      {rowLabel && <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 sm:text-[10px]">{rowLabel}</p>}
      <div className="flex w-full flex-wrap items-start justify-center gap-x-1 gap-y-3 px-1">
        {players.map((player, i) => (
          <PlayerAvatar key={`${player.name}-${i}`} player={player} side={side} size={size} events={events} />
        ))}
      </div>
    </div>
  );
}

/**
 * Pitch partagé, style Sofascore/Google : équipe extérieure en haut (gardien
 * tout en haut), équipe domicile en bas (gardien tout en bas), les deux
 * attaques se faisant face à la ligne médiane. Terrain agrandi (hauteur
 * minimale au lieu d'un simple aspect-ratio) pour laisser la place aux
 * étiquettes de ligne (gardien/défense/milieu/attaque) et aux badges
 * d'événements sans écraser les avatars.
 */
export function FormationPitch({ home, away, events }: { home: LineupSummary; away: LineupSummary; events: MatchEventSummary[] }) {
  const t = useTranslations("players");
  const homeRows = splitIntoRows(home.startingXI, home.formation);
  const awayRows = splitIntoRows(away.startingXI, away.formation);

  if (homeRows.length === 0 && awayRows.length === 0) return null;

  // Événements filtrés par équipe avant tout matching de nom : deux joueurs
  // d'équipes différentes peuvent partager un nom très proche (ex. "José
  // Ángel" côté A et "José Ángel Carmona" côté B) — sans ce filtre, un
  // événement de l'équipe B pouvait s'attribuer à tort à un joueur de
  // l'équipe A (vérifié sur un match réel, 2026-09-07).
  const homeEvents = events.filter((e) => e.teamId === home.teamId);
  const awayEvents = events.filter((e) => e.teamId === away.teamId);

  const rowLabel = (index: number, totalRows: number): string | null => {
    const key = rowLabelKey(index, totalRows);
    return key ? t(key) : null;
  };

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-2xl">
      <div className="relative min-h-[560px] w-full overflow-hidden rounded-3xl bg-green-800 shadow-2xl ring-1 ring-white/10 sm:min-h-[680px] lg:min-h-[780px]">
        {/* Lignes du terrain, purement décoratives — fond plat façon Google, sans texture de tonte */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-2 rounded-sm border-2 border-white/70" />
          <div className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/70" style={{ width: "calc(100% - 1rem)" }} />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70 sm:h-32 sm:w-32" />
          <div className="absolute left-1/2 top-3 h-16 w-32 -translate-x-1/2 border-2 border-t-0 border-white/70 sm:top-4 sm:h-20 sm:w-40" />
          <div className="absolute bottom-3 left-1/2 h-16 w-32 -translate-x-1/2 border-2 border-b-0 border-white/70 sm:bottom-4 sm:h-20 sm:w-40" />
        </div>

        {/* Formation de chaque équipe, en haut de sa propre moitié de terrain */}
        {away.formation && (
          <span className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white sm:top-3 sm:px-3 sm:text-xs">
            {away.formation}
          </span>
        )}
        {home.formation && (
          <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white sm:bottom-3 sm:px-3 sm:text-xs">
            {home.formation}
          </span>
        )}

        <div className="relative flex h-1/2 flex-col gap-1 px-1 pb-2 pt-8 sm:pt-10">
          {awayRows.map((row, i) => (
            <PlayerRow key={i} players={row} side="away" rowLabel={rowLabel(i, awayRows.length)} events={awayEvents} />
          ))}
        </div>
        <div className="relative flex h-1/2 flex-col-reverse gap-1 px-1 pb-8 pt-2 sm:pb-10">
          {homeRows.map((row, i) => (
            <PlayerRow key={i} players={row} side="home" rowLabel={rowLabel(i, homeRows.length)} events={homeEvents} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubstituteRow({ player, side, events }: { player: LineupPlayer; side: Side; events: MatchEventSummary[] }) {
  const badges = getPlayerEvents(player.name, events);
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
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full",
          badges.redCard ? "ring-2 ring-red-500" : undefined,
          player.photoUrl ? "bg-rf-bg-elevated" : AVATAR_FALLBACK_CLASS[side],
        )}
      >
        {player.photoUrl ? (
          <Image src={player.photoUrl} alt={player.name} width={28} height={28} className="h-full w-full object-cover" unoptimized />
        ) : (
          <span className="text-[9px] font-bold">{initials(player.name)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate">{player.name}</p>
        {player.position && <p className="truncate text-[11px] text-rf-fg-subtle">{player.position}</p>}
      </div>
      <EventBadges badges={badges} />
    </li>
  );
}

export function SubstitutesList({
  lineup,
  side,
  events,
  team,
}: {
  lineup: LineupSummary;
  side: Side;
  events: MatchEventSummary[];
  team: { name: string; crestUrl: string | null };
}) {
  if (lineup.substitutes.length === 0) return null;

  // Filtré par équipe pour la même raison que dans FormationPitch : évite
  // qu'un joueur d'une autre équipe au nom proche pollue ses badges.
  const teamEvents = events.filter((e) => e.teamId === lineup.teamId);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-1.5">
        <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="sm" />
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-rf-fg-subtle">{team.name}</p>
      </div>
      <ul className="space-y-2">
        {lineup.substitutes.map((player, i) => (
          <SubstituteRow key={`${lineup.teamId}-sub-${i}`} player={player} side={side} events={teamEvents} />
        ))}
      </ul>
    </div>
  );
}
