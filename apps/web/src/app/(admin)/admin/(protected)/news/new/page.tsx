import { NewsForm } from "@/components/admin/NewsForm";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

export default async function AdminNewsNewPage() {
  await requireAdminPagePermission("manageNews");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Nouvel article</h1>
      <NewsForm mode="create" />
    </div>
  );
}
