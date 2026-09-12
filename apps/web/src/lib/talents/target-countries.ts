export type TargetCountryGroup = "northAfrica" | "gulf" | "europe";

export interface TargetCountryOption {
  code: string;
  group: TargetCountryGroup;
}

/**
 * Liste curatée (section 8 du plan) — volontairement distincte de la liste de
 * nationalités dérivée des joueurs synchronisés (apps/web/src/lib/data/nationalities.ts),
 * qui n'inclurait jamais les pays du Golfe (aucun joueur scouté n'y appartient).
 * Extensible par simple ajout d'une entrée, aucune migration nécessaire.
 */
export const TARGET_COUNTRIES: TargetCountryOption[] = [
  { code: "MA", group: "northAfrica" },
  { code: "DZ", group: "northAfrica" },
  { code: "TN", group: "northAfrica" },
  { code: "EG", group: "northAfrica" },
  { code: "LY", group: "northAfrica" },
  { code: "SA", group: "gulf" },
  { code: "AE", group: "gulf" },
  { code: "QA", group: "gulf" },
  { code: "KW", group: "gulf" },
  { code: "BH", group: "gulf" },
  { code: "OM", group: "gulf" },
  { code: "FR", group: "europe" },
  { code: "ES", group: "europe" },
  { code: "BE", group: "europe" },
  { code: "DE", group: "europe" },
  { code: "IT", group: "europe" },
  { code: "PT", group: "europe" },
  { code: "NL", group: "europe" },
  { code: "GB", group: "europe" },
  { code: "TR", group: "europe" },
];

export const TARGET_COUNTRY_GROUPS: TargetCountryGroup[] = ["northAfrica", "gulf", "europe"];

export function targetCountryFlagUrl(code: string): string {
  return `https://flagcdn.com/h40/${code.toLowerCase()}.png`;
}

/** Nom du pays traduit dans la langue courante — pas de table à maintenir, voir nationality-flags.ts pour le même principe. */
export function targetCountryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
