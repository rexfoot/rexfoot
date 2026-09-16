import Link from "next/link";
import Image from "next/image";
import { Plus, Newspaper, AlertTriangle, Sparkles } from "lucide-react";
import type { NewsStatus } from "@rexfoot/db";
import { getAllNewsForAdmin } from "@/lib/data/news-admin";
import { NEWS_CATEGORY_LABELS } from "@/lib/news-categories";
import { AdminButton, Banner } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { GenerateVideoButton } from "@/components/admin/GenerateVideoButton";
import { EmptyState } from "@/components/EmptyState";
import { isCurrentlyBreaking } from "@/lib/breaking";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";
import { can } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<NewsStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

interface PageProps {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}

export default async function AdminNewsListPage({ searchParams }: PageProps) {
  const admin = await requireAdminPagePermission("viewNews");
  const canManage = can(admin.role, "manageNews");
  const canDelete = can(admin.role, "deleteNews");
  const { saved, deleted } = await searchParams;
  const articles = await getAllNewsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-rf-fg">Actualités</h1>
        {canManage && (
          <Link href="/admin/news/new">
            <AdminButton>
              <Plus size={18} />
              Nouvel article
            </AdminButton>
          </Link>
        )}
      </div>

      {saved && <Banner kind="success">Article enregistré avec succès.</Banner>}
      {deleted && <Banner kind="success">Article supprimé.</Banner>}

      {articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Aucun article pour l'instant"
          description={
            canManage
              ? "Clique sur « Nouvel article » pour publier ta première actualité."
              : "Aucun article n'a encore été publié."
          }
        />
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex flex-col gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-lg bg-rf-bg-elevated sm:w-24">
                {article.coverImageUrl ? (
                  <Image src={article.coverImageUrl} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Newspaper size={18} className="text-rf-fg-subtle" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-rf-fg">{article.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-rf-fg-muted">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold",
                      article.status === "PUBLISHED" && "bg-rf-success/15 text-rf-success",
                      article.status === "DRAFT" && "bg-rf-fg-subtle/15 text-rf-fg-muted",
                      article.status === "ARCHIVED" && "bg-rf-live/15 text-rf-live",
                    )}
                  >
                    {STATUS_LABELS[article.status]}
                  </span>
                  <span>{NEWS_CATEGORY_LABELS[article.category]}</span>
                  <span>{new Date(article.createdAt).toLocaleDateString("fr-FR")}</span>
                  {isCurrentlyBreaking(article.isBreaking, article.breakingSince) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rf-live/15 px-2 py-0.5 font-semibold text-rf-live">
                      <AlertTriangle size={11} />
                      Urgent
                    </span>
                  )}
                  {article.isAiDraft && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-rf-gold/15 px-2 py-0.5 font-semibold text-rf-gold"
                      title="Rédigé par l'agent éditorial IA — à vérifier avant publication"
                    >
                      <Sparkles size={11} />
                      IA — à vérifier
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {canManage && (
                  <GenerateVideoButton articleId={article.id} articleStatus={article.status} />
                )}
                {canManage && (
                  <Link
                    href={`/admin/news/${article.id}/edit`}
                    className="rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
                  >
                    Modifier
                  </Link>
                )}
                {canDelete && (
                  <DeleteButton
                    endpoint={`/api/admin/news/${article.id}`}
                    redirectTo="/admin/news?deleted=1"
                    confirmMessage={`Supprimer définitivement « ${article.title} » ?`}
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
