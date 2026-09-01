import { NewsForm } from "@/components/admin/NewsForm";

export default function AdminNewsNewPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Nouvel article</h1>
      <NewsForm mode="create" />
    </div>
  );
}
