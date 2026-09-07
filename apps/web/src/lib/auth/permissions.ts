import type { UserRole } from "@rexfoot/db";

/** Tous les rôles habilités à se connecter sur /admin — USER (visiteur public) en est exclu. */
export const ADMIN_ROLES: UserRole[] = ["ADMIN", "EDITOR", "JOURNALIST", "MODERATOR", "ANALYST"];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/** Étiquette affichée dans l'UI — ADMIN reste "Super Admin" sans changer la valeur stockée en base. */
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Utilisateur",
  JOURNALIST: "Journaliste",
  EDITOR: "Éditeur",
  MODERATOR: "Modérateur",
  ANALYST: "Analyste",
  ADMIN: "Super Admin",
};

/**
 * Matrice de permissions du panel admin (section 25 du plan). Un Journaliste
 * écrit et publie ses articles mais ne peut pas en supprimer ; le Mercato et
 * la gestion des utilisateurs restent à l'Éditeur/Super Admin ; le Modérateur
 * s'occupe des vidéos ; l'Analyste a un accès en lecture seule aux listes
 * (actus/mercato/vidéos) et au tableau de bord — jamais de création, édition
 * ou suppression (voir les `viewX` ci-dessous, distincts des `manageX`).
 */
export const PERMISSIONS = {
  manageNews: ["ADMIN", "EDITOR", "JOURNALIST"],
  deleteNews: ["ADMIN", "EDITOR"],
  viewNews: ["ADMIN", "EDITOR", "JOURNALIST", "ANALYST"],
  manageTransfers: ["ADMIN", "EDITOR"],
  viewTransfers: ["ADMIN", "EDITOR", "ANALYST"],
  manageVideos: ["ADMIN", "EDITOR", "MODERATOR"],
  viewVideos: ["ADMIN", "EDITOR", "MODERATOR", "ANALYST"],
  manageUsers: ["ADMIN"],
  manageLiveAudio: ["ADMIN"],
} satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as UserRole[]).includes(role);
}
