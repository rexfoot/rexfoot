import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeftRight } from "lucide-react";
import type { TransferStatus } from "@rexfoot/db";
import { getPublishedTransfers } from "@/lib/data/transfers";
import { isTransferStatus } from "@/lib/transfer-status";
import { TransferCard } from "@/components/TransferCard";
import { TransferStatusFilter } from "@/components/TransferStatusFilter";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("mercato"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/mercato", locale) };
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function MercatoPage({ searchParams }: PageProps) {
  const t = await getTranslations("mercato");
  const { status } = await searchParams;
  const selected: TransferStatus | undefined = isTransferStatus(status) ? status : undefined;
  const transfers = await getPublishedTransfers(selected);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>
      <TransferStatusFilter selected={selected} />

      {transfers.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title={t("noTransfers")} description={t("noTransfersDescription")} />
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
