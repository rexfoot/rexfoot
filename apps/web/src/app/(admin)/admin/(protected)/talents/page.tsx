import Link from "next/link";
import Image from "next/image";
import { Star, User as UserIcon } from "lucide-react";
import type { TalentModerationStatus } from "@rexfoot/db";
import { getAllTalentsForAdmin } from "@/lib/data/talents-admin";
import { AdminButton, Banner } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { EmptyState } from "@/components/EmptyState";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<TalentModerationStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Validé",
  REJECTED: "Refusé",
  HIDDEN: "Masqué",
};

interface PageProps {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}

export default async function AdminTalentsListPage({ searchParams }: PageProps) {
  const admin = await requireAdminPagePermission("viewTalents");
  const canManage = can(admin.role, "manageTalents");
  const { saved, deleted } = await searchParams;
  const talents = await getAllTalentsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-rf-fg">RexFoot Talents</h1>
      </div>

      {saved && <Banner kind="success">Profil enregistré avec succès.</Banner>}
      {deleted && <Banner kind="success">Profil supprimé.</Banner>}

      {talents.length === 0 ? (
        <EmptyState icon={Star} title="Aucune soumission pour l'instant" description="Les profils envoyés par les joueurs apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {talents.map((talent) => (
            <div
              key={talent.id}
              className="flex flex-col gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-rf-bg-elevated">
                {talent.photoUrl ? (
                  <Image src={talent.photoUrl} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserIcon size={20} className="text-rf-fg-subtle" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-rf-fg">
                  {talent.firstName} {talent.lastName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-rf-fg-muted">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold",
                      talent.status === "APPROVED" && "bg-rf-success/15 text-rf-success",
                      talent.status === "PENDING" && "bg-rf-orange/15 text-rf-orange",
                      talent.status === "REJECTED" && "bg-rf-live/15 text-rf-live",
                      talent.status === "HIDDEN" && "bg-rf-fg-subtle/15 text-rf-fg-muted",
                    )}
                  >
                    {STATUS_LABELS[talent.status]}
                  </span>
                  <span>{talent.nationality}</span>
                  <span>{talent.currentCountry}</span>
                  {talent.currentClub && <span>{talent.currentClub}</span>}
                  {!talent.videoId && <span className="text-rf-live">Sans vidéo</span>}
                  <span>{new Date(talent.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {canManage && (
                  <Link href={`/admin/talents/${talent.id}/edit`}>
                    <AdminButton variant="secondary">Modifier</AdminButton>
                  </Link>
                )}
                {canManage && (
                  <DeleteButton
                    endpoint={`/api/admin/talents/${talent.id}`}
                    redirectTo="/admin/talents?deleted=1"
                    confirmMessage={`Supprimer définitivement le profil de ${talent.firstName} ${talent.lastName} ?`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
