import { requireAdminPagePermission } from "@/lib/auth/admin-guard";
import { getAdminUsers } from "@/lib/data/users-admin";
import { UserRoleRow } from "@/components/admin/UserRoleRow";
import { InviteAdminForm } from "@/components/admin/InviteAdminForm";

export default async function AdminUsersPage() {
  const admin = await requireAdminPagePermission("manageUsers");
  const users = await getAdminUsers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-rf-fg">Utilisateurs</h1>
        <p className="mt-1 text-sm text-rf-fg-muted">Gère les comptes ayant accès au panel d&apos;administration.</p>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <UserRoleRow key={user.id} user={user} isSelf={user.id === admin.id} />
        ))}
      </div>

      <InviteAdminForm />
    </div>
  );
}
