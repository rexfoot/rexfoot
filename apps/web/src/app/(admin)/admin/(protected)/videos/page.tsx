import Link from "next/link";
import Image from "next/image";
import { Plus, Film, Loader2 } from "lucide-react";
import type { VideoStatus } from "@rexfoot/db";
import { getAllVideosForAdmin } from "@/lib/data/videos-admin";
import { AdminButton, Banner } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SyncButton } from "@/components/admin/SyncButton";
import { EmptyState } from "@/components/EmptyState";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<VideoStatus, string> = {
  UPLOADING: "Envoi en cours",
  PROCESSING: "Traitement en cours",
  READY: "Prête",
  FAILED: "Échec",
};

interface PageProps {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}

export default async function AdminVideosListPage({ searchParams }: PageProps) {
  const admin = await requireAdminPagePermission("viewVideos");
  const canManage = can(admin.role, "manageVideos");
  const { saved, deleted } = await searchParams;
  const videos = await getAllVideosForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-rf-fg">Vidéos</h1>
        {canManage && (
          <Link href="/admin/videos/new">
            <AdminButton>
              <Plus size={18} />
              Ajouter une vidéo
            </AdminButton>
          </Link>
        )}
      </div>

      {saved && <Banner kind="success">Vidéo mise à jour.</Banner>}
      {deleted && <Banner kind="success">Vidéo supprimée.</Banner>}

      {videos.length === 0 ? (
        <EmptyState
          icon={Film}
          title="Aucune vidéo pour l'instant"
          description={
            canManage
              ? "Clique sur « Ajouter une vidéo » pour publier ton premier highlight."
              : "Aucune vidéo n'a encore été publiée."
          }
        />
      ) : (
        <div className="space-y-3">
          {videos.map((video) => {
            const isProcessing = video.status === "UPLOADING" || video.status === "PROCESSING";
            return (
              <div
                key={video.id}
                className="flex flex-col gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-lg bg-rf-bg-elevated sm:w-24">
                  {video.thumbnailUrl ? (
                    <Image src={video.thumbnailUrl} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {isProcessing ? (
                        <Loader2 size={18} className="animate-spin text-rf-fg-subtle" />
                      ) : (
                        <Film size={18} className="text-rf-fg-subtle" />
                      )}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-rf-fg">{video.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-rf-fg-muted">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-semibold",
                        video.status === "READY" && "bg-rf-success/15 text-rf-success",
                        isProcessing && "bg-rf-fg-subtle/15 text-rf-fg-muted",
                        video.status === "FAILED" && "bg-rf-live/15 text-rf-live",
                      )}
                    >
                      {STATUS_LABELS[video.status]}
                    </span>
                    <span>{new Date(video.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    {isProcessing && <SyncButton videoId={video.id} />}
                    <Link
                      href={`/admin/videos/${video.id}/edit`}
                      className="rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
                    >
                      Modifier
                    </Link>
                    <DeleteButton
                      endpoint={`/api/admin/videos/${video.id}`}
                      redirectTo="/admin/videos?deleted=1"
                      confirmMessage={`Supprimer définitivement « ${video.title} » ?`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
