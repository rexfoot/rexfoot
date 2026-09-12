import type { NewsCategory } from "@rexfoot/db";

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  TRANSFERTS: "Transferts",
  RESULTATS: "Résultats",
  ANALYSES: "Analyses",
  INTERVIEWS: "Interviews",
  COMPETITIONS: "Compétitions",
  INTERNATIONAL: "International",
  PORTRAITS: "Portraits",
  AUTRE: "Autre",
};

export const NEWS_CATEGORY_VALUES = Object.keys(NEWS_CATEGORY_LABELS) as NewsCategory[];
