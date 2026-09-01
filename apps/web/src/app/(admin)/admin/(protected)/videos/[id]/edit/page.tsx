import { notFound } from "next/navigation";
import { getVideoByIdForAdmin } from "@/lib/data/videos-admin";
import { VideoEditForm } from "@/components/admin/VideoEditForm";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVideoEditPage({ params }: PageProps) {
  await requireAdminPagePermission("manageVideos");
  const { id } = await params;
  const video = await getVideoByIdForAdmin(id);
  if (!video) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Modifier la vidéo</h1>
      <VideoEditForm videoId={video.id} initial={{ title: video.title, description: video.description ?? "" }} />
    </div>
  );
}
