import { Skeleton } from "@/components/Skeleton";

/** Squelettes de la page d'accueil, un par section, affichés dans les <Suspense> de page.tsx
 *  pendant que chaque section fetch ses données côté serveur — jamais de texte "chargement...". */

function NewsCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function NewsSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-rf-border">
        <Skeleton className="aspect-4/3 w-full rounded-none sm:aspect-16/7" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 sm:p-8">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-8 w-3/4 sm:h-10" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function VideoRailSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-hidden px-4 pb-1 sm:mx-0 sm:px-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-44 shrink-0 sm:w-56">
          <Skeleton className="aspect-9/16 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function MatchCardSkeleton() {
  return (
    <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function MatchesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}
