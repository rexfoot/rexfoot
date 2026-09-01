import Link from "next/link";
import { Newspaper, Film, ArrowLeftRight, Plus } from "lucide-react";
import { prisma } from "@rexfoot/db";
import { AdminButton } from "@/components/admin/ui";

export default async function AdminDashboardPage() {
  const [publishedNews, draftNews, videos, transfers] = await Promise.all([
    prisma.newsArticle.count({ where: { status: "PUBLISHED" } }),
    prisma.newsArticle.count({ where: { status: "DRAFT" } }),
    prisma.video.count(),
    prisma.transfer.count({ where: { publishedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-rf-fg">Tableau de bord</h1>
        <p className="mt-1 text-sm text-rf-fg-muted">Bienvenue — que veux-tu publier aujourd&apos;hui ?</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Newspaper} label="Actualités publiées" value={publishedNews} />
        <StatCard icon={Newspaper} label="Brouillons" value={draftNews} />
        <StatCard icon={Film} label="Vidéos" value={videos} />
        <StatCard icon={ArrowLeftRight} label="Transferts publiés" value={transfers} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/admin/news/new">
          <AdminButton className="w-full sm:w-auto">
            <Plus size={18} />
            Nouvel article
          </AdminButton>
        </Link>
        <Link href="/admin/transfers/new">
          <AdminButton variant="secondary" className="w-full sm:w-auto">
            <Plus size={18} />
            Nouveau transfert
          </AdminButton>
        </Link>
        <Link href="/admin/videos/new">
          <AdminButton variant="secondary" className="w-full sm:w-auto">
            <Plus size={18} />
            Ajouter une vidéo
          </AdminButton>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Newspaper; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-5">
      <Icon size={20} className="text-rf-gold" />
      <p className="mt-3 font-display text-3xl font-extrabold text-rf-fg">{value}</p>
      <p className="mt-1 text-sm text-rf-fg-muted">{label}</p>
    </div>
  );
}
