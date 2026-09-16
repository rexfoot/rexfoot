export interface NavItem {
  href: string;
  icon: "home" | "matches" | "standings" | "portraits" | "video" | "news" | "talents" | "wire" | "more";
  /**
   * Masqué dans BottomNav (mobile) uniquement — utilisé pour Talents,
   * qui a déjà son propre raccourci dans MobileHeader (icône étoile, en
   * haut) depuis le 2026-09-12. Demandé par Hicham pour libérer une place
   * dans la barre du bas, déjà chargée (Portraits vient d'y arriver).
   * Sidebar (desktop, pas de raccourci équivalent en haut) ignore ce champ
   * et affiche toujours l'entrée.
   */
  hideInBottomNav?: boolean;
}

/**
 * Source unique des entrées de navigation — pilote à la fois BottomNav (mobile)
 * et Sidebar (desktop). Pas de `label` en dur : chaque `icon` correspond
 * exactement à une clé du namespace "nav" des messages (messages/*.json).
 *
 * "mercato" retiré du menu le 2026-09-12 (Hicham : zéro trafic sur /mercato,
 * remplacé par "portraits") — la page /mercato et ses données existent
 * toujours, juste plus promue ici. Les rumeurs de transfert restent
 * publiables comme un article normal (catégorie TRANSFERTS).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "home" },
  { href: "/matches", icon: "matches" },
  { href: "/classements", icon: "standings" },
  { href: "/portraits", icon: "portraits" },
  { href: "/video", icon: "video" },
  { href: "/news", icon: "news" },
  { href: "/talents", icon: "talents", hideInBottomNav: true },
  // Kiosque multi-médias (agrégateur RSS, voir AggregatedHeadline) — même
  // traitement que Talents : un raccourci propre plutôt qu'une 7e icône dans
  // une BottomNav déjà chargée (voir le commentaire de hideInBottomNav).
  // Demandé par Hicham (2026-09-17) : le rendre plus visible qu'un simple
  // lien discret depuis /news, sans pour autant l'imposer sur mobile.
  { href: "/wire", icon: "wire", hideInBottomNav: true },
];
