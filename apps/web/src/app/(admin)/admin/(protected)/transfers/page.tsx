import Link from "next/link";
import { Plus, ArrowLeftRight, ArrowRight } from "lucide-react";
import { getAllTransfersForAdmin } from "@/lib/data/transfers-admin";
import { TRANSFER_STATUS_LABELS, TRANSFER_STATUS_STYLES } from "@/lib/transfer-status";
import { AdminButton, Banner } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}

export default async function AdminTransfersListPage({ searchParams }: PageProps) {
  const admin = await requireAdminPagePermission("viewTransfers");
  const canManage = can(admin.role, "manageTransfers");
  const { saved, deleted } = await searchParams;
  const transfers = await getAllTransfersForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-rf-fg">Mercato</h1>
        {canManage && (
          <Link href="/admin/transfers/new">
            <AdminButton>
              <Plus size={18} />
              Nouveau transfert
            </AdminButton>
          </Link>
        )}
      </div>

      {saved && <Banner kind="success">Transfert enregistré avec succès.</Banner>}
      {deleted && <Banner kind="success">Transfert supprimé.</Banner>}

      {transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Aucun transfert pour l'instant"
          description={
            canManage
              ? "Clique sur « Nouveau transfert » pour ajouter ta première rumeur ou officialisation."
              : "Aucun transfert n'a encore été publié."
          }
        />
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="flex flex-col gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      TRANSFER_STATUS_STYLES[transfer.status],
                    )}
                  >
                    {TRANSFER_STATUS_LABELS[transfer.status]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      transfer.publishedAt ? "bg-rf-success/15 text-rf-success" : "bg-rf-fg-subtle/15 text-rf-fg-muted",
                    )}
                  >
                    {transfer.publishedAt ? "Publié" : "Brouillon"}
                  </span>
                </div>
                <p className="mt-1.5 truncate font-medium text-rf-fg">{transfer.playerName}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-rf-fg-muted">
                  <span className="truncate">{transfer.fromClubName ?? "Club libre"}</span>
                  <ArrowRight size={12} className="shrink-0" />
                  <span className="truncate">{transfer.toClubName ?? "Destination inconnue"}</span>
                </div>
              </div>

              {canManage && (
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/transfers/${transfer.id}/edit`}
                    className="rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
                  >
                    Modifier
                  </Link>
                  <DeleteButton
                    endpoint={`/api/admin/transfers/${transfer.id}`}
                    redirectTo="/admin/transfers?deleted=1"
                    confirmMessage={`Supprimer définitivement le transfert de « ${transfer.playerName} » ?`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
