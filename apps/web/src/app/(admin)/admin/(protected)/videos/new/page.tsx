import { VideoUploadForm } from "@/components/admin/VideoUploadForm";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

export default async function AdminVideoNewPage() {
  await requireAdminPagePermission("manageVideos");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Ajouter une vidéo</h1>
      <VideoUploadForm />
    </div>
  );
}
