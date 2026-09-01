import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import type { TransferStatus } from "@rexfoot/db";
import { getPublishedTransfers } from "@/lib/data/transfers";
import { isTransferStatus } from "@/lib/transfer-status";
import { TransferCard } from "@/components/TransferCard";
import { TransferStatusFilter } from "@/components/TransferStatusFilter";
import { EmptyState } from "@/components/EmptyState";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mercato",
  description: "Toutes les rumeurs et transferts officiels du mercato football, avec leur niveau de fiabilité.",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function MercatoPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const selected: TransferStatus | undefined = isTransferStatus(status) ? status : undefined;
  const transfers = await getPublishedTransfers(selected);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Mercato</h1>
      <TransferStatusFilter selected={selected} />

      {transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Aucun transfert pour l'instant"
          description="Les rumeurs et transferts officiels apparaîtront ici dès qu'ils seront publiés."
        />
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <TransferCard key={transfer.id} transfer={transfer} />
          ))}
        </div>
      )}
    </div>
  );
}
