import { TransferForm } from "@/components/admin/TransferForm";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

export default async function AdminTransferNewPage() {
  await requireAdminPagePermission("manageTransfers");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Nouveau transfert</h1>
      <TransferForm mode="create" />
    </div>
  );
}
