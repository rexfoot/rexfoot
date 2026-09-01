import { cn } from "@/lib/cn";

/** Bloc de base pour les squelettes de chargement — remplace tout texte/état vide pendant le fetch. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-rf-bg-elevated", className)} />;
}
