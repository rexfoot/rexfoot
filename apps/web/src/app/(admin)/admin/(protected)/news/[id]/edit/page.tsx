import { notFound } from "next/navigation";
import { getNewsArticleByIdForAdmin } from "@/lib/data/news-admin";
import { htmlToText } from "@/lib/text-to-html";
import { NewsForm } from "@/components/admin/NewsForm";
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
    </div>
  );
}
