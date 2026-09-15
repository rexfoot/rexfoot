import { notFound } from "next/navigation";
import { Sparkles, ExternalLink, Film, ImageIcon } from "lucide-react";
import { getNewsArticleByIdForAdmin } from "@/lib/data/news-admin";
import { htmlToText } from "@/lib/text-to-html";
import { NewsForm } from "@/components/admin/NewsForm";
import { GenerateVideoButton } from "@/components/admin/GenerateVideoButton";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminNewsEditPage({ params }: PageProps) {
  await requireAdminPagePermission("manageNews");
  const { id } = await params;
  const article = await getNewsArticleByIdForAdmin(id);
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Modifier l&apos;article</h1>

      {article.isAiDraft && (
        <div className="max-w-2xl space-y-3 rounded-2xl border border-rf-gold/30 bg-rf-gold/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-rf-gold">
            <Sparkles size={15} />
            Rédigé par l&apos;agent éditorial IA — relis et vérifie avant de publier.
          </p>

          {article.sources.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-rf-fg-subtle uppercase">
                Sources consultées
              </p>
              <ul className="space-y-1">
                {article.sources.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-rf-fg hover:text-rf-gold hover:underline"
                    >
                      <ExternalLink size={13} className="shrink-0" />
                      <span className="text-rf-fg-subtle">[{source.publisherName}]</span>
                      <span className="truncate">{source.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {article.suggestedVideoUrl && (
            <a
              href={article.suggestedVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-rf-fg hover:text-rf-gold hover:underline"
            >
              <Film size={14} />
              Vidéo suggérée (à intégrer manuellement si pertinent)
            </a>
          )}

          {article.suggestedCoverImageUrl && (
            <div className="space-y-1.5">
              <a
                href={article.suggestedCoverImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-rf-fg hover:text-rf-gold hover:underline"
              >
                <ImageIcon size={14} />
                Image suggérée (à reprendre manuellement dans le champ image de couverture si pertinent)
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.suggestedCoverImageUrl}
                alt=""
                className="h-32 w-auto rounded-lg border border-rf-gold/20 object-cover"
              />
            </div>
          )}
        </div>
      )}

      <NewsForm
        mode="edit"
        articleId={article.id}
        initial={{
          title: article.title,
          category: article.category,
          summary: article.summary ?? "",
          content: htmlToText(article.contentHtml),
          coverImageUrl: article.coverImageUrl,
          isBreaking: article.isBreaking,
          breakingPriority: article.breakingPriority,
        }}
      />

      <GenerateVideoButton articleId={article.id} articleStatus={article.status} />
    </div>
  );
}
