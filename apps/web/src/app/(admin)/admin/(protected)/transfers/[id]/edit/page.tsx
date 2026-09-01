import { notFound } from "next/navigation";
import { getTransferByIdForAdmin } from "@/lib/data/transfers-admin";
import { TransferForm } from "@/components/admin/TransferForm";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTransferEditPage({ params }: PageProps) {
  await requireAdminPagePermission("manageTransfers");
  const { id } = await params;
  const transfer = await getTransferByIdForAdmin(id);
  if (!transfer) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Modifier le transfert</h1>
      <TransferForm
        mode="edit"
        transferId={transfer.id}
        initial={{
          playerName: transfer.playerName,
          fromClubName: transfer.fromClubName ?? "",
          toClubName: transfer.toClubName ?? "",
          status: transfer.status,
          feeMillionEur: transfer.feeMillionEur !== null ? String(transfer.feeMillionEur) : "",
          isFree: transfer.isFree,
          transferDate: transfer.transferDate ? transfer.transferDate.toISOString().slice(0, 10) : "",
          sourceName: transfer.sourceName ?? "",
          sourceUrl: transfer.sourceUrl ?? "",
          notes: transfer.notes ?? "",
        }}
      />
    </div>
  );
}
